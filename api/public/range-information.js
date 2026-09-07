import { gunzipSync } from 'node:zlib';

const PAYLOAD_PATHS = [
  '/data/range-payload-01.b64',
  '/data/range-payload-02.b64',
  '/data/range-payload-03.b64',
  '/data/range-payload-04.b64',
  '/data/range-payload-05.b64',
];

function getOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  if (!host) throw new Error('Request host is unavailable.');
  return `${forwardedProto}://${host}`;
}

async function loadPayload(req) {
  const origin = getOrigin(req);
  const responses = await Promise.all(
    PAYLOAD_PATHS.map(async path => {
      const response = await fetch(new URL(path, origin), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Range payload request failed (${response.status}) for ${path}.`);
      }
      const content = (await response.text()).trim();
      if (!content) throw new Error(`Range payload is empty: ${path}.`);
      return content;
    })
  );

  const encoded = responses.join('');
  if (!encoded || encoded.length !== 32404 || !encoded.startsWith('H4sI')) {
    throw new Error('Range payload assembly is invalid.');
  }

  return gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
}

function expandDataset(compact) {
  if (!compact || typeof compact !== 'object' || !Array.isArray(compact.sheets)) {
    throw new Error('Range dataset structure is invalid.');
  }

  return {
    source_file: String(compact.source_file || 'Kodinga Range Infromation(2).xlsx'),
    sheets: compact.sheets.map(sheet => {
      if (!sheet || typeof sheet !== 'object' || !Array.isArray(sheet.headers) || !Array.isArray(sheet.rows)) {
        throw new Error('Range sheet structure is invalid.');
      }

      const headers = sheet.headers.map(value => String(value ?? ''));
      const rows = sheet.rows.map(row => {
        if (!Array.isArray(row) || row.length < 4) {
          throw new Error(`Range row structure is invalid in ${String(sheet.name || 'unknown sheet')}.`);
        }

        const fields = {};
        headers.forEach((header, index) => {
          if (!header) return;
          const value = row[index + 4];
          if (value !== null && value !== undefined && value !== '') {
            fields[header] = value;
          }
        });

        return {
          source_row: Number(row[0]),
          section: row[1] == null || row[1] === '' ? null : String(row[1]),
          beat: row[2] == null || row[2] === '' ? null : String(row[2]),
          year: row[3] == null || row[3] === '' ? null : String(row[3]),
          fields,
        };
      });

      return {
        name: String(sheet.name || ''),
        tables: [{ headers, rows }],
        record_count: rows.length,
      };
    }),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    const json = await loadPayload(req);
    const compact = JSON.parse(json);
    const data = expandDataset(compact);

    if (data.sheets.length !== 29) {
      throw new Error(`Range dataset validation failed: expected 29 sheets, received ${data.sheets.length}.`);
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
