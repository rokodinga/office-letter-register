import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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
  if (!clientId || !clientSecret) throw new Error('Google Gmail OAuth is not configured.');
  return { clientId, clientSecret };
}

async function verifyAdmin(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) throw new Error('Missing authorization token.');

  const decoded = await getAuth(getAdminApp()).verifyIdToken(authHeader.slice(7));
  const profile = (await getAdminDb().collection('users').doc(decoded.uid).get()).data();

  if (!profile || profile.role !== 'Administrator' || profile.status !== 'active') {
    throw new Error('Administrator permission required.');
  }

  return decoded.uid;
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
    throw new Error(data.error_description || 'Unable to refresh Gmail access token.');
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

function parseAddresses(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseEmailAddress(value) {
  const match = String(value || '').match(/<([^>]+)>/);
  return (match?.[1] || String(value || '').trim()).toLowerCase();
}

function recipientMatchesPolicy(to, cc = '') {
  const allowedRecipients = csvEnv(
    'GMAIL_OUTGOING_ALLOWED_RECIPIENTS',
    'dfo.nabarangpur@odisha.gov.in',
  );
  const allowedDomains = csvEnv(
    'GMAIL_OUTGOING_ALLOWED_DOMAINS',
    'odisha.gov.in,gov.in,nic.in',
  );

  if (!allowedRecipients.length && !allowedDomains.length) {
    throw new Error('Gmail sent-mail sync is locked: configure GMAIL_OUTGOING_ALLOWED_RECIPIENTS or GMAIL_OUTGOING_ALLOWED_DOMAINS.');
  }

  const addresses = [...parseAddresses(to), ...parseAddresses(cc)].map(parseEmailAddress);
  return addresses.some((email) => {
    const domain = email.includes('@') ? email.split('@').pop() : '';
    return allowedRecipients.includes(email)
      || allowedDomains.some((allowed) => domain === allowed || domain.endsWith('.' + allowed));
  });
}

async function syncSentMailbox(db, connectionId, refreshToken) {
  const token = await accessToken(refreshToken);
  const connection = (await db.collection('gmailConnections').doc(connectionId).get()).data();
  const lastSyncMillis = connection?.lastSentSyncAt?.toMillis?.();
  const dateQuery = lastSyncMillis
    ? 'after:' + Math.floor(lastSyncMillis / 1000)
    : 'newer_than:30d';

  let processed = 0;
  let createdPending = 0;
  let skippedFiltered = 0;
  let pageToken = '';

  for (let page = 0; page < 5; page += 1) {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('maxResults', '100');
    url.searchParams.set('labelIds', 'SENT');
    url.searchParams.set('q', 'in:sent ' + dateQuery);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const listResponse = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const list = await listResponse.json();
    if (!listResponse.ok) throw new Error(list.error?.message || 'Gmail sent-mail list request failed.');

    const messages = list.messages || [];

    for (let i = 0; i < messages.length; i += 10) {
      const batch = messages.slice(i, i + 10);
      const details = await Promise.all(batch.map(async (message) => {
        const detailResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + message.id
            + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date',
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
        const to = header(headers, 'To');
        const cc = header(headers, 'Cc');

        if (!recipientMatchesPolicy(to, cc)) {
          skippedFiltered += 1;
          continue;
        }

        const dateHeader = header(headers, 'Date');
        const dateValue = dateHeader || (detail.internalDate ? new Date(Number(detail.internalDate)).toISOString() : new Date().toISOString());
        const gmailUrl = 'https://mail.google.com/mail/u/0/#sent/' + detail.id;
        const gmailRef = db.collection('gmailSent').doc(detail.id);
        const existing = (await gmailRef.get()).data();

        await gmailRef.set({
          id: detail.id,
          threadId: detail.threadId || null,
          subject,
          from,
          to,
          cc,
          date: dateValue,
          snippet: detail.snippet || '',
          url: gmailUrl,
          source: 'gmail',
          sentAt: detail.internalDate ? Number(detail.internalDate) : Date.now(),
          syncedAt: FieldValue.serverTimestamp(),
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
    lastSentSyncAt: FieldValue.serverTimestamp(),
    lastError: FieldValue.delete(),
    lastErrorAt: FieldValue.delete(),
  }, { merge: true });

  return { processed, createdPending, skippedFiltered };
}

export default async function handler(req, res) {
  try {
    const mode = String(req.query?.mode || '');

    if (mode === 'sync') {
      const cronAuth = req.headers.authorization || '';
      const isCron = Boolean(process.env.CRON_SECRET && cronAuth === 'Bearer ' + process.env.CRON_SECRET);
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
          const result = await syncSentMailbox(db, item.id, data.refreshToken);
          processed += result.processed;
          createdPending += result.createdPending;
          skippedFiltered += result.skippedFiltered;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Gmail sent-mail sync failed.';
          errors.push({ connectionId: item.id, error: message });
          await item.ref.set({
            lastError: message,
            lastErrorAt: FieldValue.serverTimestamp(),
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

    if (mode === 'cleanup') {
      await verifyAdmin(req);
      const db = getAdminDb();
      const snapshot = await db.collection('gmailSent').get();
      const batch = db.batch();
      let deleted = 0;

      for (const item of snapshot.docs) {
        const data = item.data();
        if (!data?.registeredLetterId && data?.registered !== true) {
          batch.delete(item.ref);
          deleted += 1;
        }
      }
      if (deleted) await batch.commit();

      const connections = await db.collection('gmailConnections').where('active', '==', true).get();
      for (const connection of connections.docs) {
        await connection.ref.set({
          lastSentSyncAt: FieldValue.delete(),
          lastError: FieldValue.delete(),
          lastErrorAt: FieldValue.delete(),
        }, { merge: true });
      }

      return res.status(200).json({ ok: true, deleted });
    }

    return res.status(400).json({ error: 'Unknown Gmail sent-mail operation.' });
  } catch (error) {
    console.error('Gmail sent-mail API error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Gmail sent-mail operation failed.' });
  }
}
