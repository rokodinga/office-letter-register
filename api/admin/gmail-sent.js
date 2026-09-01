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
    throw new Error(
      'Gmail sent-mail sync is locked: configure GMAIL_OUTGOING_ALLOWED_RECIPIENTS or GMAIL_OUTGOING_ALLOWED_DOMAINS.',
    );
  }

  const addresses = [...parseAddresses(to), ...parseAddresses(cc)].map(parseEmailAddress);
  return addresses.some((email) => {
    const domain = email.includes('@') ? email.split('@').pop() : '';
    return allowedRecipients.includes(email)
      || allowedDomains.some((allowed) => domain === allowed || domain.endsWith('.' + allowed));
  });
}

async function listSentMessages(token, dateQuery, pageToken = '') {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', '100');
  // Use Gmail search as the source of truth. labelIds=SENT + q=in:sent can
  // unnecessarily constrain searches for some Gmail accounts.
  url.searchParams.set('q', 'in:sent ' + dateQuery);
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Gmail sent-mail list request failed.');
  }

  return data;
}

async function getSentMessage(token, messageId) {
  const url = new URL(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + messageId,
  );
  url.searchParams.set('format', 'metadata');
  for (const name of ['Subject', 'From', 'To', 'Cc', 'Date']) {
    url.searchParams.append('metadataHeaders', name);
  }

  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const data = await response.json();

  return response.ok ? data : null;
}

async function syncSentMailbox(db, connectionId, refreshToken) {
  const token = await accessToken(refreshToken);
  const connection = (await db.collection('gmailConnections').doc(connectionId).get()).data();

  // Always use a generous overlap window. The previous implementation used
  // the exact server timestamp from the prior sync, which could cause Gmail
  // messages to be missed between syncs and could leave a stale cursor that
  // returned an empty result forever.
  const lastSyncMillis = connection?.lastSentSyncAt?.toMillis?.();
  const overlapMillis = 10 * 60 * 1000;
  const dateQuery = lastSyncMillis
    ? 'after:' + Math.max(0, Math.floor((lastSyncMillis - overlapMillis) / 1000))
    : 'newer_than:90d';

  let examined = 0;
  let processed = 0;
  let createdPending = 0;
  let skippedFiltered = 0;
  let alreadyRegistered = 0;
  let pageToken = '';
  let newestMessageMillis = lastSyncMillis || 0;

  for (let page = 0; page < 10; page += 1) {
    const list = await listSentMessages(token, dateQuery, pageToken);
    const messages = Array.isArray(list.messages) ? list.messages : [];

    for (let i = 0; i < messages.length; i += 10) {
      const batch = messages.slice(i, i + 10);
      const details = await Promise.all(
        batch.map((message) => getSentMessage(token, message.id)),
      );

      for (const detail of details) {
        if (!detail) continue;

        examined += 1;
        const internalMillis = detail.internalDate ? Number(detail.internalDate) : 0;
        if (internalMillis > newestMessageMillis) newestMessageMillis = internalMillis;

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
        const dateValue = dateHeader
          || (internalMillis ? new Date(internalMillis).toISOString() : new Date().toISOString());
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
          sentAt: internalMillis || Date.now(),
          syncedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        if (!existing) {
          await gmailRef.set({
            registered: false,
            reviewStatus: 'pending',
          }, { merge: true });
          createdPending += 1;
        } else if (!existing.registeredLetterId) {
          // Keep an existing pending queue entry pending, but do not count it
          // as a newly created item on every subsequent sync.
          await gmailRef.set({
            registered: false,
            reviewStatus: existing.reviewStatus || 'pending',
          }, { merge: true });
        } else {
          alreadyRegistered += 1;
        }

        processed += 1;
      }
    }

    pageToken = list.nextPageToken || '';
    if (!pageToken || messages.length === 0) break;
  }

  // Only advance the cursor after the entire mailbox scan completed
  // successfully. If Gmail returned an error, the catch path leaves the
  // previous cursor intact so the next sync can retry.
  const cursorMillis = newestMessageMillis || Date.now();
  await db.collection('gmailConnections').doc(connectionId).set({
    lastSentSyncAt: cursorMillis,
    lastSentSyncAtDate: new Date(cursorMillis).toISOString(),
    lastSentSyncExamined: examined,
    lastSentSyncProcessed: processed,
    lastSentSyncFiltered: skippedFiltered,
    lastSentSyncAtServer: FieldValue.serverTimestamp(),
    lastError: FieldValue.delete(),
    lastErrorAt: FieldValue.delete(),
  }, { merge: true });

  return {
    examined,
    processed,
    createdPending,
    skippedFiltered,
    alreadyRegistered,
  };
}

export default async function handler(req, res) {
  try {
    const mode = String(req.query?.mode || '');

    if (mode === 'list') {
      await verifyAdmin(req);
      const db = getAdminDb();
      const snapshot = await db.collection('gmailSent')
        .orderBy('sentAt', 'desc')
        .limit(200)
        .get();

      return res.status(200).json({
        ok: true,
        items: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
      });
    }

    if (mode === 'register') {
      const uid = await verifyAdmin(req);
      const gmailId = String(req.body?.gmailId || '');
      const letterId = String(req.body?.letterId || '');
      if (!gmailId || !letterId) {
        return res.status(400).json({ error: 'gmailId and letterId are required.' });
      }

      const db = getAdminDb();
      await db.collection('gmailSent').doc(gmailId).set({
        registered: true,
        registeredLetterId: letterId,
        registeredAt: FieldValue.serverTimestamp(),
        registeredBy: uid,
        reviewStatus: 'registered',
      }, { merge: true });

      return res.status(200).json({ ok: true });
    }

    if (mode === 'sync') {
      const cronAuth = req.headers.authorization || '';
      const isCron = Boolean(process.env.CRON_SECRET && cronAuth === 'Bearer ' + process.env.CRON_SECRET);
      if (!isCron) await verifyAdmin(req);

      const db = getAdminDb();
      const connections = await db.collection('gmailConnections').where('active', '==', true).get();
      let examined = 0;
      let processed = 0;
      let createdPending = 0;
      let skippedFiltered = 0;
      let alreadyRegistered = 0;
      const errors = [];

      for (const item of connections.docs) {
        const data = item.data();
        if (!data.refreshToken) continue;

        try {
          const result = await syncSentMailbox(db, item.id, data.refreshToken);
          examined += result.examined;
          processed += result.processed;
          createdPending += result.createdPending;
          skippedFiltered += result.skippedFiltered;
          alreadyRegistered += result.alreadyRegistered;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Gmail sent-mail sync failed.';
          const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : '';

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
        examined,
        processed,
        createdPending,
        skippedFiltered,
        alreadyRegistered,
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
          lastSentSyncAtDate: FieldValue.delete(),
          lastSentSyncExamined: FieldValue.delete(),
          lastSentSyncProcessed: FieldValue.delete(),
          lastSentSyncFiltered: FieldValue.delete(),
          lastSentSyncAtServer: FieldValue.delete(),
          lastError: FieldValue.delete(),
          lastErrorAt: FieldValue.delete(),
        }, { merge: true });
      }

      return res.status(200).json({ ok: true, deleted });
    }

    return res.status(400).json({ error: 'Unknown Gmail sent-mail operation.' });
  } catch (error) {
    console.error('Gmail sent-mail API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Gmail sent-mail operation failed.',
    });
  }
}
