import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    const db = getAdminDb();

    // Use Firestore aggregation counts instead of downloading register records.
    // This keeps the public endpoint limited to aggregate numbers only.
    const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
      db.collection('incomingLetters').count().get(),
      db.collection('outgoingLetters').count().get(),
    ]);

    const incoming = Number(incomingSnapshot.data().count || 0);
    const outgoing = Number(outgoingSnapshot.data().count || 0);

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({
      ok: true,
      incoming,
      outgoing,
      total: incoming + outgoing,
    });
  } catch (error) {
    console.error('Public register stats error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to load register statistics.' });
  }
}
