import { gunzipSync } from 'node:zlib';

const DATA_PATH = '/data/kodinga-range-information.json.gz.b64';

function getOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) throw new Error('Request host is unavailable.');
  return `${forwardedProto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    const assetUrl = new URL(DATA_PATH, getOrigin(req));
    const response = await fetch(assetUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Range asset request failed (${response.status}).`);
    }

    const encoded = (await response.text()).trim();
    if (!encoded || !encoded.startsWith('H4sI')) {
      throw new Error('Range asset content is missing or invalid.');
    }

    const json = gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.sheets)) {
      throw new Error('Range dataset structure is invalid.');
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).send(JSON.stringify(data));
  } catch (error) {
    console.error('Public Range information error:', error);
    return res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to load the Range information dataset.',
    });
  }
}
