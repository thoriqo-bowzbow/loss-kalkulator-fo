import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = new URL('./data/', import.meta.url);
const HISTORY_FILE = new URL('./data/history.json', import.meta.url);
const MAX_ENTRIES = 50;

/** Path fisik file history (untuk pesan error/info). */
export function historyPath() {
  return fileURLToPath(HISTORY_FILE);
}

async function readAll() {
  try {
    const raw = await readFile(HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(entries) {
  await mkdir(dirname(historyPath()), { recursive: true });
  await writeFile(HISTORY_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

/** Tambah satu entri; yang terlama dibuang bila melebihi MAX_ENTRIES. */
export async function addEntry(entry) {
  const entries = await readAll();
  entries.push(entry);
  while (entries.length > MAX_ENTRIES) entries.shift();
  await writeAll(entries);
}

/** List entri terbaru (terlama → terbaru), maksimal `limit`. */
export async function listEntries(limit = 10) {
  const entries = await readAll();
  return entries.slice(-limit).reverse();
}

/** Ambil entri berdasarkan nomor tampilan 1-based (dari list terbaru). */
export async function getEntry(number) {
  const list = await listEntries(MAX_ENTRIES);
  return list[number - 1] ?? null;
}

export async function clearEntries() {
  await writeAll([]);
}
