import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, inflateRawSync } from 'node:zlib';

const DATA_PARTS = [
  'public/data/range-payload-01.b64',
  'public/data/range-payload-02.b64',
  'public/data/range-payload-03.b64',
  'public/data/range-payload-04.b64',
  'public/data/range-payload-05.b64',
];

function getAssetPaths() {
  const roots = [process.cwd(), '/var/task'];
  for (const root of roots) {
    const paths = DATA_PARTS.map(part => join(root, part));
    if (paths.every(existsSync)) return paths;
  }
  throw new Error('Range dataset payload files are not bundled.');
}

function decodeRangeAsset(encoded) {
  if (!encoded || !encoded.startsWith('H4sI')) {
    throw new Error('Range asset content is missing or invalid.');
  }
  const bytes = Buffer.from(encoded, 'base64');
  try {
    return gunzipSync(bytes).toString('utf8');
  } catch (error) {
    if (!(error instanceof Error) || !/incorrect data check|checksum/i.test(error.message)) throw error;
    if (bytes.length < 18) throw error;
    return inflateRawSync(bytes.subarray(10, -8)).toString('utf8');
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  let stage = 'asset-read';
  try {
    const paths = getAssetPaths();
    const encoded = paths.map(path => readFileSync(path, 'utf8').trim()).join('');
    stage = 'gzip-decode';
    const json = decodeRangeAsset(encoded);
    stage = 'json-parse';
    const data = JSON.parse(json);
    stage = 'dataset-validation';
    if (!data || !Array.isArray(data.sheets)) throw new Error('Range dataset structure is invalid.');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).send(JSON.stringify(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load the Range information dataset.';
    console.error('Public Range information error:', { stage, message });
    return res.status(502).json({ ok: false, stage, error: message });
  }
}
