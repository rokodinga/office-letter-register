import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

function bearer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw new Error('Missing authorization token.');
  return header.slice(7);
}

async function requireAdmin(req) {
  const app = getAdminApp();
  const adminAuth = getAuth(app);
  const adminDb = getFirestore(app);
  const decoded = await adminAuth.verifyIdToken(bearer(req));
  const snap = await adminDb.collection('users').doc(decoded.uid).get();
  const profile = snap.data();
  if (!profile || profile.role !== 'Administrator' || profile.status !== 'active') {
    throw new Error('Administrator permission required.');
  }
  return { adminAuth, adminDb, actor: decoded };
}

async function audit(db, actorUid, action, targetUid, details = {}) {
  await db.collection('auditLogs').add({
    actorUid, targetUid, action, details, createdAt: FieldValue.serverTimestamp(),
  });
}

export default async function handler(req, res) {
  try {
    const { adminAuth, adminDb, actor } = await requireAdmin(req);

    if (req.method === 'GET') {
      const authUsers = await adminAuth.listUsers(1000);
      const profiles = await adminDb.collection('users').get();
      const profileMap = new Map(profiles.docs.map((item) => [item.id, item.data()]));

      const users = authUsers.users.map((account) => ({
        uid: account.uid,
        displayName: account.displayName || profileMap.get(account.uid)?.displayName || '',
        email: account.email || profileMap.get(account.uid)?.email || '',
        photoURL: account.photoURL || profileMap.get(account.uid)?.photoURL || '',
        role: profileMap.get(account.uid)?.role || 'User',
        status: account.disabled ? 'disabled' : (profileMap.get(account.uid)?.status || 'active'),
        emailVerified: account.emailVerified,
        createdAt: account.metadata.creationTime || null,
        lastSignInTime: account.metadata.lastSignInTime || null,
      }));
      return res.status(200).json({ users });
    }

    if (req.method === 'PATCH') {
      const { uid, role, status } = req.body || {};
      if (!uid || (role !== undefined && !['User', 'Administrator'].includes(role)) ||
          (status !== undefined && !['active', 'disabled'].includes(status))) {
        return res.status(400).json({ error: 'Invalid user update.' });
      }
      if (uid === actor.uid) {
        return res.status(400).json({ error: 'You cannot change your own role or account status.' });
      }

      const targetRef = adminDb.collection('users').doc(uid);
      const target = await targetRef.get();
      if (!target.exists) return res.status(404).json({ error: 'User profile not found.' });
      const current = target.data() || {};

      if ((current.role === 'Administrator' && role === 'User') ||
          (current.role === 'Administrator' && status === 'disabled')) {
        const admins = await adminDb.collection('users')
          .where('role', '==', 'Administrator').where('status', '==', 'active').get();
        if (admins.size <= 1) {
          return res.status(400).json({ error: 'The last active administrator cannot be removed or disabled.' });
        }
      }

      const updates = { updatedAt: FieldValue.serverTimestamp() };
      if (role !== undefined) updates.role = role;
      if (status !== undefined) updates.status = status;
      await targetRef.set(updates, { merge: true });

      if (status !== undefined) await adminAuth.updateUser(uid, { disabled: status === 'disabled' });

      const auditDetails = {};
      if (role !== undefined) auditDetails.role = role;
      if (status !== undefined) auditDetails.status = status;
      await audit(adminDb, actor.uid, 'UPDATE_USER', uid, auditDetails);

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      if (body.action === 'createUser') {
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const photoURL = typeof body.photoURL === 'string' ? body.photoURL.trim() : '';
        const role = body.role === 'Administrator' ? 'Administrator' : 'User';

        if (!displayName) return res.status(400).json({ error: 'Full name is required.' });
        if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email address is required.' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

        try {
          const existing = await adminAuth.getUserByEmail(email);
          if (existing) return res.status(409).json({ error: 'That email address is already registered.' });
        } catch (error) {
          if (error?.code !== 'auth/user-not-found') throw error;
        }

        let createdUser;
        try {
          createdUser = await adminAuth.createUser({
            email,
            password,
            displayName,
            photoURL: photoURL || undefined,
            disabled: false,
            emailVerified: false,
          });

          await adminDb.collection('users').doc(createdUser.uid).set({
            uid: createdUser.uid,
            displayName,
            email,
            photoURL,
            role,
            status: 'active',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          await audit(adminDb, actor.uid, 'CREATE_USER', createdUser.uid, { role, email });
        } catch (error) {
          if (createdUser?.uid) {
            try { await adminAuth.deleteUser(createdUser.uid); } catch (cleanupError) {
              console.error('Failed to clean up partially created user:', cleanupError);
            }
          }
          throw error;
        }

        return res.status(201).json({
          ok: true,
          user: {
            uid: createdUser.uid,
            displayName: createdUser.displayName || displayName,
            email: createdUser.email || email,
            photoURL: createdUser.photoURL || photoURL,
            role,
            status: 'active',
            emailVerified: createdUser.emailVerified,
          },
        });
      }

      const { uid, action } = body;
      if (!uid || !['revokeSessions', 'delete'].includes(action)) {
        return res.status(400).json({ error: 'Invalid administrator action.' });
      }
      if (uid === actor.uid) {
        return res.status(400).json({ error: 'You cannot perform this action on your own account.' });
      }

      const target = await adminDb.collection('users').doc(uid).get();
      if (!target.exists) return res.status(404).json({ error: 'User profile not found.' });

      if (action === 'delete') {
        const data = target.data() || {};
        if (data.role === 'Administrator') {
          const admins = await adminDb.collection('users')
            .where('role', '==', 'Administrator').where('status', '==', 'active').get();
          if (admins.size <= 1) {
            return res.status(400).json({ error: 'The last active administrator cannot be deleted.' });
          }
        }
        await adminAuth.deleteUser(uid);
        await adminDb.collection('users').doc(uid).delete();
        await audit(adminDb, actor.uid, 'DELETE_USER', uid);
        return res.status(200).json({ ok: true });
      }

      await adminAuth.revokeRefreshTokens(uid);
      await audit(adminDb, actor.uid, 'REVOKE_SESSIONS', uid);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET,PATCH,POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Admin user API error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    const status = message.includes('permission') || message.includes('authorization') ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}
