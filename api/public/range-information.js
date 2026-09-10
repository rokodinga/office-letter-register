import { brotliDecompressSync } from 'node:zlib';

const PAYLOAD_PATHS = [
  '/data/range-brotli-01.b64',
  '/data/range-brotli-02.b64',
  '/data/range-brotli-03.b64',
  '/data/range-brotli-04.b64',
];

const EXPECTED_PAYLOAD_LENGTH = 26236;
const EXPECTED_SHEET_COUNT = 29;

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
        throw new Error(`Range data part request failed (${response.status}) for ${path}.`);
      }

      const content = (await response.text()).trim();
      if (!content) throw new Error(`Range data part is empty: ${path}.`);
      return content;
    }),
  );

  const encoded = responses.join('');

  if (
    encoded.length !== EXPECTED_PAYLOAD_LENGTH ||
    !encoded.startsWith('W7pjMjsYg/OA') ||
    !encoded.endsWith('8XouOWVn1zw=')
  ) {
    throw new Error('Range data payload assembly failed validation.');
  }

  const compressed = Buffer.from(encoded, 'base64');
  return brotliDecompressSync(compressed).toString('utf8');
}

function expandDataset(compact) {
  if (
    !compact ||
    typeof compact !== 'object' ||
    typeof compact.s !== 'string' ||
    !Array.isArray(compact.h) ||
    !Array.isArray(compact.q)
  ) {
    throw new Error('Range dataset structure is invalid.');
  }

  const headers = compact.h.map(value => String(value ?? ''));

  return {
    source_file: compact.s,
    sheets: compact.q.map((sheetRecord, sheetIndex) => {
      if (
        !Array.isArray(sheetRecord) ||
        sheetRecord.length !== 3 ||
        typeof sheetRecord[0] !== 'string' ||
        !Array.isArray(sheetRecord[1]) ||
        !Array.isArray(sheetRecord[2])
      ) {
        throw new Error(`Range sheet ${sheetIndex + 1} has invalid structure.`);
      }

      const [name, headerIndices, sourceRows] = sheetRecord;
      const sheetHeaders = headerIndices.map(index => {
        const numericIndex = Number(index);
        if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= headers.length) {
          throw new Error(`Range sheet ${name} contains an invalid header index.`);
        }
        return headers[numericIndex];
      });

      const rows = sourceRows.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== headerIndices.length + 4) {
          throw new Error(`Range row ${rowIndex + 1} in ${name} has invalid structure.`);
        }

        const fields = {};
        sheetHeaders.forEach((header, fieldIndex) => {
          if (!header) return;
          const value = row[fieldIndex + 4];
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
        name,
        tables: [{ headers: sheetHeaders, rows }],
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
    const compactJson = await loadPayload(req);
    const compact = JSON.parse(compactJson);
    const data = expandDataset(compact);

    if (data.sheets.length !== EXPECTED_SHEET_COUNT) {
      throw new Error(
        `Range dataset validation failed: expected ${EXPECTED_SHEET_COUNT} sheets, received ${data.sheets.length}.`,
      );
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
