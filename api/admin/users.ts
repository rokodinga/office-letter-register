import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

function getBearerToken(req: VercelRequest) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new Error('Missing authorization token.');
  return header.slice(7);
}

async function requireAdmin(req: VercelRequest) {
  const app = getAdminApp();
  const adminAuth = getAuth(app);
  const adminDb = getFirestore(app);
  const decoded = await adminAuth.verifyIdToken(getBearerToken(req));
  const profile = await adminDb.collection('users').doc(decoded.uid).get();
  const data = profile.data();
  if (!data || data.role !== 'admin' || data.status !== 'active') throw new Error('Administrator permission required.');
  return { app, adminAuth, adminDb, actor: decoded };
}

async function audit(adminDb: FirebaseFirestore.Firestore, actorUid: string, action: string, targetUid: string, details: Record<string, unknown> = {}) {
  await adminDb.collection('auditLogs').add({
    actorUid, targetUid, action, details, createdAt: FieldValue.serverTimestamp(),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        role: profileMap.get(account.uid)?.role || 'user',
        status: account.disabled ? 'disabled' : (profileMap.get(account.uid)?.status || 'active'),
        emailVerified: account.emailVerified,
        createdAt: profileMap.get(account.uid)?.createdAt || null,
        lastSignInTime: account.metadata.lastSignInTime || null,
      }));
      return res.status(200).json({ users });
    }

    if (req.method === 'PATCH') {
      const { uid, role, status } = req.body || {};
      if (!uid || (role !== undefined && !['user', 'admin'].includes(role)) || (status !== undefined && !['active', 'disabled'].includes(status))) {
        return res.status(400).json({ error: 'Invalid user update.' });
      }
      if (uid === actor.uid) return res.status(400).json({ error: 'You cannot change your own role or account status.' });

      const targetRef = adminDb.collection('users').doc(uid);
      const target = await targetRef.get();
      if (!target.exists) return res.status(404).json({ error: 'User profile not found.' });
      const current = target.data() || {};

      if (current.role === 'admin' && role === 'user') {
        const admins = await adminDb.collection('users').where('role', '==', 'admin').where('status', '==', 'active').get();
        if (admins.size <= 1) return res.status(400).json({ error: 'The last active administrator cannot be removed.' });
      }
      if (status === 'disabled' && current.role === 'admin') {
        const admins = await adminDb.collection('users').where('role', '==', 'admin').where('status', '==', 'active').get();
        if (admins.size <= 1) return res.status(400).json({ error: 'The last active administrator cannot be disabled.' });
      }

      const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
      if (role !== undefined) updates.role = role;
      if (status !== undefined) updates.status = status;
      await targetRef.set(updates, { merge: true });

      if (status !== undefined) await adminAuth.updateUser(uid, { disabled: status === 'disabled' });
      await audit(adminDb, actor.uid, 'UPDATE_USER', uid, { role, status });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const { uid, action } = req.body || {};
      if (!uid || !['revokeSessions', 'delete'].includes(action)) return res.status(400).json({ error: 'Invalid administrator action.' });
      if (uid === actor.uid) return res.status(400).json({ error: 'You cannot perform this action on your own account.' });

      const target = await adminDb.collection('users').doc(uid).get();
      if (!target.exists) return res.status(404).json({ error: 'User profile not found.' });
      if (action === 'delete') {
        const data = target.data() || {};
        if (data.role === 'admin') {
          const admins = await adminDb.collection('users').where('role', '==', 'admin').where('status', '==', 'active').get();
          if (admins.size <= 1) return res.status(400).json({ error: 'The last active administrator cannot be deleted.' });
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
    const status = message.includes('permission') || message.includes('Missing authorization') ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}
