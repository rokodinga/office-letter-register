import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'node:crypto';

function getAdminApp() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getApps()[0];
}

function getAdminDb() {
  getAdminApp();
  return getFirestore();
}

function oauthConfig() {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL
    || 'office-letter-register.vercel.app';
  const defaultRedirectUri = 'https://' + productionHost + '/api/admin/gmail?mode=callback';
  const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI || defaultRedirectUri;

  if (!clientId || !clientSecret) {
    throw new Error('Google Gmail OAuth is not configured. Add GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET in Vercel Environment Variables.');
  }

  return { clientId, clientSecret, redirectUri };
}

function signState(uid) {
  const secret = process.env.GMAIL_OAUTH_STATE_SECRET;
  if (!secret) throw new Error('GMAIL_OAUTH_STATE_SECRET is not configured.');
  const payload = Buffer.from(
    JSON.stringify({ uid, exp: Date.now() + 10 * 60 * 1000 }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyState(state) {
  const secret = process.env.GMAIL_OAUTH_STATE_SECRET;
  if (!secret || !state) throw new Error('Invalid OAuth state.');

  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw new Error('Invalid OAuth state.');

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const providedBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid OAuth state signature.');
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (!data.uid || !data.exp || data.exp < Date.now()) throw new Error('OAuth state has expired.');
  return data.uid;
}

async function verifyAdmin(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) throw new Error('Missing authorization token.');

  const decoded = await getAuth(getAdminApp()).verifyIdToken(authHeader.slice(7));
  const db = getAdminDb();
  const profile = (await db.collection('users').doc(decoded.uid).get()).data();

  if (!profile || profile.role !== 'Administrator' || profile.status !== 'active') {
    throw new Error('Administrator permission required.');
  }

  return decoded.uid;
}

async function exchangeCode(code) {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || 'Google OAuth token exchange failed.');
  }

  return data;
}

async function accessToken(refreshToken) {
  const { clientId, clientSecret } = oauthConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    const error = new Error(
      data.error_description || data.error || 'Unable to refresh Gmail access token.',
    );
    error.code = data.error || 'token_refresh_failed';
    throw error;
  }

  return data.access_token;
}

function header(headers, name) {
  return headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function csvEnv(name, fallback = '') {
  return String(process.env[name] || fallback)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseEmailAddress(value) {
  const match = String(value || '').match(/<([^>]+)>/);
  return (match?.[1] || String(value || '').trim()).toLowerCase();
}

function gmailSyncPolicy() {
  const allowedSenders = csvEnv('GMAIL_ALLOWED_SENDERS', 'dfo.nabarangpur@odisha.gov.in');
  const allowedDomains = csvEnv('GMAIL_ALLOWED_DOMAINS', 'odisha.gov.in,gov.in,nic.in');

  if (!allowedSenders.length && !allowedDomains.length) {
    throw new Error('Gmail sync is locked: configure GMAIL_ALLOWED_SENDERS or GMAIL_ALLOWED_DOMAINS.');
  }

  return { allowedSenders, allowedDomains };
}

function senderMatchesPolicy(from) {
  const { allowedSenders, allowedDomains } = gmailSyncPolicy();
  const email = parseEmailAddress(from);
  const domain = email.includes('@') ? email.split('@').pop() : '';

  return allowedSenders.some((sender) => email === sender)
    || allowedDomains.some((allowedDomain) =>
      domain === allowedDomain || domain.endsWith('.' + allowedDomain)
    );
}

function buildGmailQuery(lastSyncMillis) {
  const { allowedSenders, allowedDomains } = gmailSyncPolicy();

  const dateQuery = lastSyncMillis
    ? 'after:' + Math.floor(lastSyncMillis / 1000)
    : 'newer_than:30d';

  const senderParts = [
    ...allowedSenders.map((sender) => 'from:' + sender),
    ...allowedDomains.map((domain) => 'from:' + domain),
  ];

  const senderQuery = senderParts.length > 1
    ? '{' + senderParts.join(' ') + '}'
    : senderParts[0];

  return dateQuery
    + ' category:primary'
    + ' -category:social'
    + ' -category:promotions'
    + ' -category:updates'
    + ' -category:forums'
    + ' -category:reservations'
    + ' -category:purchases'
    + ' ' + senderQuery;
}

async function gmailProfile(token) {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Unable to read Gmail profile.');
  return data;
}

async function syncMailbox(db, connectionId, refreshToken) {
  const token = await accessToken(refreshToken);
  const profile = await gmailProfile(token);
  const connection = (await db.collection('gmailConnections').doc(connectionId).get()).data();
  let processed = 0;
  let createdPending = 0;
  let skippedFiltered = 0;

  const lastSyncMillis = connection?.lastSyncAt?.toMillis?.();
  const query = buildGmailQuery(lastSyncMillis);

  let pageToken = '';
  for (let page = 0; page < 5; page += 1) {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('labelIds', 'INBOX');
    url.searchParams.set('q', query);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const listResponse = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const list = await listResponse.json();
    if (!listResponse.ok) throw new Error(list.error?.message || 'Gmail list request failed.');

    const messages = list.messages || [];

    for (let i = 0; i < messages.length; i += 10) {
      const batch = messages.slice(i, i + 10);
      const details = await Promise.all(batch.map(async (message) => {
        const detailResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + message.id
            + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date',
          { headers: { Authorization: 'Bearer ' + token } },
        );
        const detail = await detailResponse.json();
        return detailResponse.ok ? detail : null;
      }));

      for (const detail of details) {
        if (!detail) continue;

        const headers = detail.payload?.headers || [];
        const subject = header(headers, 'Subject') || '(No subject)';
        const from = header(headers, 'From');

        if (!senderMatchesPolicy(from)) {
          skippedFiltered += 1;
          continue;
        }

        const to = header(headers, 'To');
        const date = header(headers, 'Date');
        const gmailUrl = 'https://mail.google.com/mail/u/0/#inbox/' + detail.id;

        const gmailRef = db.collection('gmailInbox').doc(detail.id);
        const existing = (await gmailRef.get()).data();

        await gmailRef.set({
          id: detail.id,
          threadId: detail.threadId || null,
          subject,
          from,
          to,
          date,
          snippet: detail.snippet || '',
          url: gmailUrl,
          source: 'gmail',
          receivedAt: detail.internalDate ? Number(detail.internalDate) : Date.now(),
          syncedAt: FieldValue.serverTimestamp(),
          gmailAccount: profile.emailAddress || null,
        }, { merge: true });

        if (!existing?.registeredLetterId) {
          await gmailRef.set({
            registered: false,
            reviewStatus: 'pending',
          }, { merge: true });
          createdPending += 1;
        }

        processed += 1;
      }
    }

    pageToken = list.nextPageToken || '';
    if (!pageToken || messages.length === 0) break;
  }

  await db.collection('gmailConnections').doc(connectionId).set({
    email: profile.emailAddress || null,
    lastSyncAt: FieldValue.serverTimestamp(),
    active: true,
    lastError: FieldValue.delete(),
    lastErrorAt: FieldValue.delete(),
  }, { merge: true });

  return {
    processed,
    createdPending,
    skippedFiltered,
    email: profile.emailAddress || null,
  };
}

export default async function handler(req, res) {
  try {
    const mode = String(req.query?.mode || '');

    if (mode === 'callback' || req.query?.code || req.query?.error) {
      const uid = verifyState(String(req.query?.state || ''));
      const code = String(req.query?.code || '');
      const oauthError = String(req.query?.error || '');

      if (oauthError) throw new Error(`Google authorization was not completed: ${oauthError}`);
      if (!code) throw new Error('Google did not return an authorization code.');

      const tokens = await exchangeCode(code);
      const db = getAdminDb();
      const connectionRef = db.collection('gmailConnections').doc(uid);

      if (!tokens.refresh_token) {
        await connectionRef.set({
          active: false,
          reauthorizationRequired: true,
          lastError: 'Google did not issue a new refresh token. Please reconnect and approve Gmail access again.',
          lastErrorAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        throw new Error('Google did not issue a new refresh token. Please reconnect and approve Gmail access again.');
      }

      await connectionRef.set({
        provider: 'gmail',
        refreshToken: tokens.refresh_token,
        connectedAt: FieldValue.serverTimestamp(),
        active: true,
        reauthorizationRequired: false,
        lastError: FieldValue.delete(),
        lastErrorAt: FieldValue.delete(),
      }, { merge: true });

      if (tokens.access_token) {
        const profile = await gmailProfile(tokens.access_token);
        await connectionRef.set({
          email: profile.emailAddress || null,
        }, { merge: true });
      }

      // OAuth callbacks currently land on this API endpoint. Redirect the
      // browser back to the application instead of leaving the user on a
      // standalone success page.
      const appUrl = process.env.APP_BASE_URL
        || 'https://office-letter-register.vercel.app';
      const target = new URL('/admin/gmail', appUrl);
      target.searchParams.set('gmail', 'connected');
      target.searchParams.set('t', String(Date.now()));

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Location', target.toString());
      return res.status(303).end();
    }

    if (mode === 'auth') {
      const uid = await verifyAdmin(req);
      const { clientId, redirectUri } = oauthConfig();
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent select_account');
      url.searchParams.set('include_granted_scopes', 'true');
      url.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly');
      url.searchParams.set('state', signState(uid));

      return res.status(200).json({ url: url.toString() });
    }

    if (mode === 'status') {
      const uid = await verifyAdmin(req);
      const db = getAdminDb();
      const snapshot = await db.collection('gmailConnections').doc(uid).get();
      if (!snapshot.exists) return res.status(200).json({ connected: false });

      const data = snapshot.data();
      return res.status(200).json({
        connected: Boolean(data?.active && data?.refreshToken),
        email: data?.email || null,
        connectedAt: data?.connectedAt?.toDate?.()?.toISOString?.() || null,
        lastSyncAt: data?.lastSyncAt?.toDate?.()?.toISOString?.() || null,
        lastError: data?.lastError || null,
        lastErrorAt: data?.lastErrorAt?.toDate?.()?.toISOString?.() || null,
      });
    }

    if (mode === 'cleanup-legacy') {
      await verifyAdmin(req);
      const db = getAdminDb();

      const incoming = await db.collection('incomingLetters').get();
      const incomingBatch = db.batch();
      let deletedIncoming = 0;

      for (const item of incoming.docs) {
        const data = item.data();
        if (item.id.startsWith('gmail-') && data?.source === 'gmail') {
          incomingBatch.delete(item.ref);
          deletedIncoming += 1;
        }
      }
      if (deletedIncoming) await incomingBatch.commit();

      const gmailInbox = await db.collection('gmailInbox').get();
      const gmailBatch = db.batch();
      let deletedGmailInbox = 0;

      for (const item of gmailInbox.docs) {
        const data = item.data();
        if (!data?.registeredLetterId && data?.registered !== true) {
          gmailBatch.delete(item.ref);
          deletedGmailInbox += 1;
        }
      }
      if (deletedGmailInbox) await gmailBatch.commit();

      const activeConnections = await db.collection('gmailConnections')
        .where('active', '==', true)
        .get();
      for (const connection of activeConnections.docs) {
        await connection.ref.set({
          lastSyncAt: FieldValue.delete(),
          lastError: FieldValue.delete(),
          lastErrorAt: FieldValue.delete(),
        }, { merge: true });
      }

      return res.status(200).json({
        ok: true,
        deletedIncoming,
        deletedGmailInbox,
      });
    }

    if (mode === 'disconnect') {
      const uid = await verifyAdmin(req);
      const db = getAdminDb();
      await db.collection('gmailConnections').doc(uid).delete();
      return res.status(200).json({ ok: true });
    }

    if (mode === 'sync') {
      const cronAuth = req.headers.authorization || '';
      const isCron = Boolean(process.env.CRON_SECRET && cronAuth === `Bearer ${process.env.CRON_SECRET}`);

      if (!isCron) await verifyAdmin(req);

      const db = getAdminDb();
      const connections = await db.collection('gmailConnections').where('active', '==', true).get();
      let processed = 0;
      let createdPending = 0;
      let skippedFiltered = 0;
      const errors = [];

      for (const item of connections.docs) {
        const data = item.data();
        if (!data.refreshToken) continue;

        try {
          const result = await syncMailbox(db, item.id, data.refreshToken);
          processed += result.processed;
          createdPending += result.createdPending;
          skippedFiltered += result.skippedFiltered || 0;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Gmail sync failed.';
          const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';
          console.error(`Gmail sync failed for ${item.id}:`, error);

          const tokenInvalid = errorCode === 'invalid_grant'
            || message.toLowerCase().includes('token has been expired or revoked')
            || message.toLowerCase().includes('invalid_grant');

          errors.push({ connectionId: item.id, error: message });

          await item.ref.set({
            lastError: tokenInvalid
              ? 'Gmail authorization expired or was revoked. Please reconnect Gmail.'
              : message,
            lastErrorAt: FieldValue.serverTimestamp(),
            ...(tokenInvalid
              ? { active: false, reauthorizationRequired: true }
              : {}),
          }, { merge: true });
        }
      }

      return res.status(200).json({
        ok: errors.length === 0,
        processed,
        createdPending,
        skippedFiltered,
        errors,
      });
    }

    return res.status(400).json({ error: 'Unknown Gmail operation.' });
  } catch (error) {
    console.error('Gmail API error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Gmail operation failed.' });
  }
}