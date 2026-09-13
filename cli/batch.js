import { readFile } from 'node:fs/promises';
import { lookupSplitter } from './core.js';

const CSV_HEADER = ['name', 'tx', 'km', 'splice', 'conn', 'splitter', 'rx'];

function splitCsvLine(line) {
  // CSV sederhana: tidak ada koma di dalam nilai; trim tiap sel.
  return line.split(',').map((s) => s.trim());
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

/** Baca file CSV/JSON batch → array topologi 1-segmen + nama link. */
export async function readBatch(filePath) {
  const raw = await readFile(filePath, 'utf8').catch(() => {
    throw new Error(`File tidak ditemukan: ${filePath}`);
  });

  if (filePath.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : parsed.links;
    if (!Array.isArray(items)) throw new Error('JSON batch harus berupa array atau { "links": [...] }.');
    return items.map(toTopology);
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');

  if (lines.length === 0) throw new Error('File batch kosong.');

  const first = splitCsvLine(lines[0]).map((s) => s.toLowerCase());
  const isHeader = first.includes('name') && first.includes('tx');
  const header = isHeader ? first : CSV_HEADER;
  const dataLines = isHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cells = splitCsvLine(line);
    const record = {};
    header.forEach((key, i) => {
      record[key] = cells[i];
    });
    return toTopology(record);
  });
}

function toTopology(record) {
  const name = String(record.name ?? 'LINK').slice(0, 20);
  const tx = toNumber(record.tx);
  if (tx == null) throw new Error(`[${name}] kolom tx tidak valid.`);
  const rx = toNumber(record.rx);
  if (rx == null) throw new Error(`[${name}] kolom rx tidak valid.`);
  const splitterId = record.splitter && lookupSplitter(record.splitter) ? lookupSplitter(record.splitter).id : 'none';
  if (record.splitter && !lookupSplitter(record.splitter)) {
    console.warn(`  ⚠ [${name}] splitter "${record.splitter}" tidak dikenal — dipakai Direct.`);
  }

  return {
    name,
    topology: {
      tx,
      rx,
      wavelength: toNumber(record.wavelength) ?? 1310,
      fiberTypeId: record.fiber || 'g652d',
      segments: [
        {
          name,
          km: toNumber(record.km) ?? 0,
          splice: toNumber(record.splice) ?? 0,
          conn: toNumber(record.conn) ?? 0,
          splitterId,
        },
      ],
    },
  };
}
