import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const DATA_FILE = 'public/data/kodinga-range-information-v2.gz.b64';

function getAssetPath() {
  const roots = [process.cwd(), '/var/task'];
  for (const root of roots) {
    const path = join(root, DATA_FILE);
    if (existsSync(path)) return path;
  }
  throw new Error(`Range dataset file is not bundled. Checked roots: ${roots.join(', ')}`);
}

function decodeRangeAsset(encoded) {
  if (!encoded || !encoded.startsWith('H4sI')) {
    throw new Error('Range asset content is missing or invalid.');
  }
  return gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  let stage = 'asset-read';

  try {
    const assetPath = getAssetPath();
    const encoded = readFileSync(assetPath, 'utf8').trim();

    stage = 'gzip-decode';
    const json = decodeRangeAsset(encoded);

    stage = 'json-parse';
    const data = JSON.parse(json);

    stage = 'dataset-validation';
    if (!data || !Array.isArray(data.sheets)) {
      throw new Error('Range dataset structure is invalid.');
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).send(JSON.stringify(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load the Range information dataset.';
    console.error('Public Range information error:', { stage, message });
    return res.status(502).json({
      ok: false,
      stage,
      error: message,
    });
  }
}
