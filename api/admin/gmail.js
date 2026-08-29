import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import crypto from 'node:crypto';

function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

function oauthConfig() {
  const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Gmail OAuth is not configured.');
  }
  return { clientId, clientSecret, redirectUri };
}

function signState(value) {
  const secret = process.env.GMAIL_OAUTH_STATE_SECRET;
  if (!secret) throw new Error('GMAIL_OAUTH_STATE_SECRET is not configured.');
  const payload = Buffer.from(JSON.stringify({ uid: value, exp: Date.now() + 10 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyState(state) {
  const secret = process.env.GMAIL_OAUTH_STATE_SECRET;
  if (!secret || !state) throw new Error('Invalid OAuth state.');
  const [payload, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig || ''), Buffer.from(expected))) throw new Error('Invalid OAuth state signature.');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (!data.uid || data.exp < Date.now()) throw new Error('OAuth state has expired.');
  return data.uid;
}

async function verifyAdmin(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) throw new Error('Missing authorization token.');
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  const { getAuth } = await import('firebase-admin/auth');
  const decoded = await getAuth().verifyIdToken(auth.slice(7));
  const db = getAdminDb();
  const profile = (await db.collection('users').doc(decoded.uid).get()).data();
  if (!profile || profile.role !== 'Administrator' || profile.status !== 'active') throw new Error('Administrator permission required.');
  return decoded.uid;
}

async function exchangeCode(code) {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.refresh_token) throw new Error(data.error_description || 'Google OAuth token exchange failed.');
  return data;
}

async function accessToken(refreshToken) {
  const { clientId, clientSecret } = oauthConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Unable to refresh Gmail access token.');
  return data.access_token;
}

function h(headers, name) {
  return headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

async function syncMailbox(db, refreshToken) {
  const token = await accessToken(refreshToken);
  let pageToken = '';
  let count = 0;

  do {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('labelIds', 'INBOX');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const listResponse = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const list = await listResponse.json();
    if (!listResponse.ok) throw new Error(list.error?.message || 'Gmail list request failed.');

    for (const message of list.messages || []) {
      const detailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const detail = await detailResponse.json();
      if (!detailResponse.ok) continue;

      const headers = detail.payload?.headers || [];
      await db.collection('gmailInbox').doc(detail.id).set({
        id: detail.id,
        threadId: detail.threadId || null,
        subject: h(headers, 'Subject') || '(No subject)',
        from: h(headers, 'From'),
        to: h(headers, 'To'),
        date: h(headers, 'Date'),
        snippet: detail.snippet || '',
        url: `https://mail.google.com/mail/u/0/#inbox/${detail.id}`,
        source: 'gmail',
        receivedAt: detail.internalDate ? Number(detail.internalDate) : Date.now(),
        syncedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      count++;
    }
    pageToken = list.nextPageToken || '';
  } while (pageToken);

  return count;
}

export default async function handler(req, res) {
  try {
    const mode = String(req.query?.mode || '');

    if (mode === 'callback') {
      const uid = verifyState(String(req.query?.state || ''));
      const code = String(req.query?.code || '');
      if (!code) throw new Error('Google did not return an authorization code.');
      const tokens = await exchangeCode(code);
      const db = getAdminDb();
      await db.collection('gmailConnections').doc(uid).set({
        provider: 'gmail',
        email: tokens.id_token || null,
        refreshToken: tokens.refresh_token,
        connectedAt: FieldValue.serverTimestamp(),
        active: true,
      }, { merge: true });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send('<h2>Gmail connected successfully.</h2><p>You can close this window and return to Office Letter Register.</p>');
    }

    if (mode === 'auth') {
      const uid = await verifyAdmin(req);
      const { clientId, redirectUri } = oauthConfig();
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('access_type', 'offline');
      url.searchParams.set('prompt', 'consent');
      url.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly');
      url.searchParams.set('state', signState(uid));
      return res.status(200).json({ url: url.toString() });
    }

    if (mode === 'sync') {
      const cron = req.headers['authorization'];
      if (process.env.CRON_SECRET && cron !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized cron request.' });
      }
      const db = getAdminDb();
      const connections = await db.collection('gmailConnections').where('active', '==', true).get();
      let total = 0;
      for (const item of connections.docs) {
        const data = item.data();
        if (data.refreshToken) total += await syncMailbox(db, data.refreshToken);
      }
      return res.status(200).json({ ok: true, processed: total });
    }

    return res.status(400).json({ error: 'Unknown Gmail operation.' });
  } catch (error) {
    console.error('Gmail API error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Gmail operation failed.' });
  }
}
