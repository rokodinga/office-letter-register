import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, inflateRawSync } from 'node:zlib';

const DATA_PARTS = [
  'public/data/range-fixed-01.b64',
  'public/data/range-fixed-02.b64',
  'public/data/range-fixed-03.b64',
  'public/data/range-fixed-04.b64',
  'public/data/range-fixed-05.b64',
];

function getAssetPaths() {
  const roots = [process.cwd(), '/var/task'];
  for (const root of roots) {
    const paths = DATA_PARTS.map(part => join(root, part));
    if (paths.every(existsSync)) return paths;
  }

  throw new Error(`Range dataset files are not bundled. Checked roots: ${roots.join(', ')}`);
}

function inflateGzipIgnoringChecksum(gzip) {
  if (gzip.length < 18 || gzip[0] !== 0x1f || gzip[1] !== 0x8b || gzip[2] !== 0x08) {
    throw new Error('Range asset is not a valid gzip stream.');
  }

  const flags = gzip[3];
  let offset = 10;

  if (flags & 0x04) {
    if (offset + 2 > gzip.length) throw new Error('Range gzip header is truncated.');
    const extraLength = gzip.readUInt16LE(offset);
    offset += 2 + extraLength;
  }

  const skipZeroTerminated = () => {
    while (offset < gzip.length && gzip[offset] !== 0) offset += 1;
    if (offset >= gzip.length) throw new Error('Range gzip header is truncated.');
    offset += 1;
  };

  if (flags & 0x08) skipZeroTerminated();
  if (flags & 0x10) skipZeroTerminated();
  if (flags & 0x02) offset += 2;

  const compressedEnd = gzip.length - 8;
  if (offset >= compressedEnd) throw new Error('Range gzip payload is empty.');
  return inflateRawSync(gzip.subarray(offset, compressedEnd));
}

function decodeRangeAsset(encoded) {
  const gzip = Buffer.from(encoded, 'base64');
  try {
    return gunzipSync(gzip).toString('utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/incorrect data check/i.test(message)) throw error;
    console.warn('Range gzip checksum mismatch; decoding the DEFLATE payload without the trailer checksum.');
    return inflateGzipIgnoringChecksum(gzip).toString('utf8');
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  let stage = 'asset-read';

  try {
    const assetPaths = getAssetPaths();
    const encoded = assetPaths.map(path => readFileSync(path, 'utf8').trim()).join('');

    if (!encoded || !encoded.startsWith('H4sI')) {
      throw new Error('Range asset content is missing or invalid.');
    }

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
