import { gunzipSync } from 'node:zlib';

const SOURCE = 'https://raw.githubusercontent.com/rokodinga/office-letter-register/main/public/data/kodinga-range-information.json.gz.b64';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    const response = await fetch(SOURCE, {
      headers: { Accept: 'text/plain' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Range source returned ${response.status}.`);
    }

    const encoded = (await response.text()).trim();
    if (!encoded) throw new Error('Range source is empty.');

    const json = gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
    const data = JSON.parse(json);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).send(JSON.stringify(data));
  } catch (error) {
    console.error('Public Range information error:', error);
    return res.status(502).json({
      ok: false,
      error: 'Unable to load the Range information dataset.',
    });
  }
}
