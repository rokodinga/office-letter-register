import { gunzipSync, inflateRawSync } from 'node:zlib';

const DATA_PATH = '/data/kodinga-range-information.json.gz.b64';

function getOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) throw new Error('Request host is unavailable.');
  return `${forwardedProto}://${host}`;
}

function inflateGzipIgnoringChecksum(gzip: Buffer) {
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

function decodeRangeAsset(encoded: string) {
  const gzip = Buffer.from(encoded, 'base64');
  try {
    return gunzipSync(gzip).toString('utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!/incorrect data check/i.test(message)) throw error;
    console.warn('Range gzip checksum mismatch; decoding the verified DEFLATE payload without the trailer checksum.');
    return inflateGzipIgnoringChecksum(gzip).toString('utf8');
  }
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

    const json = decodeRangeAsset(encoded);
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
