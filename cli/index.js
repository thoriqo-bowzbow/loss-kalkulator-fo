#!/usr/bin/env node
// Loss Kalkulator FO — CLI v2.0
// Mode: wizard interaktif (default), one-shot args, batch CSV/JSON, riwayat lokal.

import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import {
  calculate,
  buildSummary,
  getOpticalClass,
  lookupSplitter,
  OPTICAL_CLASSES,
  WAVELENGTHS,
  FIBER_TYPES,
  SPLITTERS,
} from './core.js';
import { createPrompter, clearScreen, displayBanner, parseDecimal, renderResult, renderBatchTable, renderProgressSummary, colors } from './ui.js';
import { readBatch } from './batch.js';
import { addEntry, listEntries, getEntry, clearEntries, historyPath } from './history.js';

const args = process.argv.slice(2);

// ── Arg parsing sederhana: --key value & flag boolean ────────────────────────
const VALUE_FLAGS = new Set(['tx', 'rx', 'km', 'splice', 'conn', 'splitter', 'wavelength', 'fiber', 'name', 'batch', 'out', 'history']);
const options = {};
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  if (VALUE_FLAGS.has(key)) {
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      options[key] = next;
      i++;
    } else {
      options[key] = true; // --history tanpa nilai / --history clear
    }
  } else {
    options[key] = true; // --json, --plain, --copy, --no-save
  }
}

// ── Util ─────────────────────────────────────────────────────────────────────
function copyToClipboard(text) {
  return new Promise((resolve) => {
    const child = spawn('clip', { shell: true, stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
    child.stdin.write(text);
    child.stdin.end();
  });
}

async function maybeCopyAndSave(result, options) {
  if (options.copy) {
    const ok = await copyToClipboard(buildSummary(result));
    console.log(ok ? colors.green('  ✓ Ringkasan disalin ke clipboard.') : colors.red('  ✗ Gagal menyalin ke clipboard (perintah "clip" tidak tersedia).'));
  }
  if (options.out) {
    const payload = options.json ? JSON.stringify(result, null, 2) : buildSummary(result);
    await writeFile(options.out, payload, 'utf8');
    console.log(colors.green(`  ✓ Laporan tersimpan ke ${options.out}`));
  }
}

async function persistHistory(name, topology, result, { skip = false } = {}) {
  if (skip || options['no-save']) return;
  await addEntry({ savedAt: Date.now(), name, topology, powerReceived: result.powerReceived, verdict: result.verdict });
}

// ── Mode: one-shot via argumen ───────────────────────────────────────────────
async function runOneShot() {
  const tx = parseDecimal(String(options.tx));
  if (tx == null) {
    console.log(colors.red('✗ --tx wajib berupa angka. Contoh: --tx 7'));
    process.exitCode = 1;
    return;
  }
  const topology = {
    tx,
    rx: parseDecimal(String(options.rx)) ?? -27,
    wavelength: parseDecimal(String(options.wavelength)) ?? 1310,
    fiberTypeId: String(options.fiber ?? 'g652d'),
    name: String(options.name ?? 'LINK'),
    segments: [
      {
        name: String(options.name ?? 'LINK'),
        km: parseDecimal(String(options.km)) ?? 0,
        splice: parseDecimal(String(options.splice)) ?? 0,
        conn: parseDecimal(String(options.conn)) ?? 0,
        splitterId: lookupSplitter(options.splitter) ? lookupSplitter(options.splitter).id : 'none',
      },
    ],
  };
  if (options.splitter && !lookupSplitter(options.splitter)) {
    console.log(colors.yellow(`⚠ Splitter "${options.splitter}" tidak dikenal — dipakai Direct.`));
    console.log(colors.gray('  Label yang tersedia: ' + SPLITTERS.filter((s) => s.id !== 'none').map((s) => s.label).join(', ')));
  }

  const result = calculate(topology);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (!options.plain) displayBanner();
    renderResult(result);
    console.log(buildSummary(result));
    console.log();
  }
  await maybeCopyAndSave(result, options);
  await persistHistory(topology.name, topology, result);
}

// ── Mode: wizard interaktif ──────────────────────────────────────────────────
async function runWizard(prompter, prefill = null) {
  let topology;

  if (prefill) {
    topology = prefill.topology ?? prefill;
    topology.opticalClassId = topology.opticalClassId ?? 'custom';
  } else {
    topology = { tx: 7, rx: -27, wavelength: 1310, fiberTypeId: 'g652d', opticalClassId: 'custom', segments: [] };
  }

  // Setiap langkah: bersihkan layar → ringkasan progres → pertanyaan berikutnya.
  const step = () => {
    clearScreen();
    renderProgressSummary(topology, topology.segments);
  };

  // 1. Kelas optik
  step();
  console.log(colors.bold('KELAS OPTIK:'));
  OPTICAL_CLASSES.forEach((cls, i) => console.log(`  ${i + 1}. ${cls.label}${cls.id !== 'custom' ? colors.gray(` (TX ${cls.txPower} dBm / RX ${cls.rxSensitivity} dBm)`) : ''}`));
  const classChoice = await prompter.ask(`Pilih kelas optik [1-${OPTICAL_CLASSES.length}] (default 1 = Custom):`, {
    transform: (v) => (v === '' ? '1' : v),
    validate: (v) => {
      const n = Number.parseInt(v, 10);
      if (Number.isNaN(n) || n < 1 || n > OPTICAL_CLASSES.length) return `masukkan nomor 1-${OPTICAL_CLASSES.length}`;
    },
  });
  const opticalClass = getOpticalClass(OPTICAL_CLASSES[Number.parseInt(classChoice, 10) - 1].id);
  topology.opticalClassId = opticalClass.id;
  if (opticalClass.id !== 'custom') {
    topology.tx = opticalClass.txPower;
    topology.rx = opticalClass.rxSensitivity;
  }

  // 2. TX / RX
  step();
  console.log(colors.bold('DAYA (OLT/SFP):'));
  const txInput = await prompter.ask(`TX Power SFP (dBm) (default ${topology.tx}):`, {
    transform: (v) => (v === '' ? String(topology.tx) : v),
    validate: (v, raw) => (raw !== '' && parseDecimal(raw) == null ? 'angka tidak valid, contoh: 7 atau -2' : undefined),
  });
  topology.tx = parseDecimal(txInput);

  const rxInput = await prompter.ask(`RX Sensitivity ONT (dBm) (default ${topology.rx}):`, {
    transform: (v) => (v === '' ? String(topology.rx) : v),
    validate: (v, raw) => (raw !== '' && parseDecimal(raw) == null ? 'angka tidak valid, contoh: -27' : undefined),
  });
  topology.rx = parseDecimal(rxInput);

  // 3. Gelombang
  step();
  console.log(colors.bold('GELOMBANG:'));
  WAVELENGTHS.forEach((wl, i) => console.log(`  ${i + 1}. ${wl} nm`));
  const wlChoice = await prompter.ask(`Pilih gelombang [1-${WAVELENGTHS.length}] (default 1 = 1310 nm):`, {
    transform: (v) => (v === '' ? '1' : v),
    validate: (v) => {
      const n = Number.parseInt(v, 10);
      if (Number.isNaN(n) || n < 1 || n > WAVELENGTHS.length) return `masukkan nomor 1-${WAVELENGTHS.length}`;
    },
  });
  topology.wavelength = WAVELENGTHS[Number.parseInt(wlChoice, 10) - 1];

  // 4. Tipe fiber
  step();
  console.log(colors.bold('TIPE FIBER:'));
  FIBER_TYPES.forEach((f, i) => console.log(`  ${i + 1}. ${f.label} ${colors.gray(`(${f.attenuation[topology.wavelength]} dB/km @ ${topology.wavelength} nm)`)}`));
  const fiberChoice = await prompter.ask(`Pilih tipe fiber [1-${FIBER_TYPES.length}] (default 1):`, {
    transform: (v) => (v === '' ? '1' : v),
    validate: (v) => {
      const n = Number.parseInt(v, 10);
      if (Number.isNaN(n) || n < 1 || n > FIBER_TYPES.length) return `masukkan nomor 1-${FIBER_TYPES.length}`;
    },
  });
  topology.fiberTypeId = FIBER_TYPES[Number.parseInt(fiberChoice, 10) - 1].id;

  // 5. Segmen (tiap segmen satu layar: ringkasan + daftar splitter)
  let adding = true;
  while (adding) {
    step();
    const index = topology.segments.length;
    const defaultName = index === 0 ? 'FEEDER' : 'ODP';
    console.log(colors.bold(`SEGMEN #${index + 1}:`));
    const name = await prompter.ask(`Nama segmen (default ${defaultName}):`, {
      transform: (v) => (v === '' ? defaultName : v.toUpperCase()),
    });

    step();
    console.log(colors.bold(`SEGMEN #${index + 1} — ${name}:`));
    const km = await prompter.ask('Panjang kabel (km):', {
      transform: (v) => String(parseDecimal(v) ?? NaN),
      validate: (v, raw) => (parseDecimal(raw) == null ? 'angka tidak valid, contoh: 5 atau 0,5' : undefined),
    });
    const splice = await prompter.ask('Jumlah splicing (titik):', {
      transform: (v) => String(parseDecimal(v) ?? NaN),
      validate: (v, raw) => (parseDecimal(raw) == null ? 'angka tidak valid' : undefined),
    });
    const conn = await prompter.ask('Jumlah konektor (pcs):', {
      transform: (v) => String(parseDecimal(v) ?? NaN),
      validate: (v, raw) => (parseDecimal(raw) == null ? 'angka tidak valid' : undefined),
    });

    step();
    console.log(colors.bold(`SEGMEN #${index + 1} — ${name}:`));
    console.log(colors.bold('SPLITTER DI UJUNG SEGMEN:'));
    SPLITTERS.forEach((s, i) => {
      const displayLabel = s.id === 'none' ? 'Direct' : s.label;
      const lossText = s.kind === 'ratio' ? `${s.loss1}/${s.loss2} dB (utama/tap)` : `${s.loss} dB`;
      console.log(`  ${i + 1}. ${displayLabel} ${colors.gray(`(${lossText})`)}`);
    });
    const splitterChoice = await prompter.ask(`Pilih splitter [1-${SPLITTERS.length}] (default 1 = Direct):`, {
      transform: (v) => (v === '' ? '1' : v),
      validate: (v) => {
        const n = Number.parseInt(v, 10);
        if (Number.isNaN(n) || n < 1 || n > SPLITTERS.length) return `masukkan nomor 1-${SPLITTERS.length}`;
      },
    });

    topology.segments.push({
      name,
      km: parseDecimal(km) ?? 0,
      splice: parseDecimal(splice) ?? 0,
      conn: parseDecimal(conn) ?? 0,
      splitterId: SPLITTERS[Number.parseInt(splitterChoice, 10) - 1].id,
    });

    step();
    const more = await prompter.ask('Tambah segmen lagi? (y/n):', {
      transform: (v) => v.toLowerCase(),
      validate: (v) => (v === 'y' || v === 'n' ? undefined : 'jawab y atau n'),
    });
    adding = more === 'y';
  }

  // Hasil di layar bersih
  clearScreen();
  const result = calculate(topology);
  renderResult(result);
  await persistHistory(topology.segments.map((s) => s.name).join('-'), topology, result);
  await maybeCopyAndSave(result, options);
  return result;
}

// ── Mode: riwayat ────────────────────────────────────────────────────────────
async function runHistory(prompter) {
  if (options.history === 'clear') {
    await clearEntries();
    console.log(colors.green('✓ Riwayat dikosongkan.'));
    return;
  }
  if (typeof options.history === 'string' && options.history !== true) {
    const entry = await getEntry(Number.parseInt(options.history, 10));
    if (!entry) {
      console.log(colors.red('✗ Nomor riwayat tidak ditemukan. Lihat daftar dengan: npm run cli -- --history'));
      process.exitCode = 1;
      return;
    }
    await runWizard(prompter, entry);
    return;
  }
  const entries = await listEntries(10);
  if (entries.length === 0) {
    console.log(colors.gray('Riwayat masih kosong. Hasil perhitungan tersimpan otomatis di ' + historyPath()));
    return;
  }
  console.log(colors.bold(`RIWAYAT (${historyPath()}):`));
  entries.forEach((e, i) => {
    console.log(`  ${i + 1}. ${new Date(e.savedAt).toLocaleString()}  ${colors.bold(e.name)}  ${e.powerReceived.toFixed(2)} dBm  ${colors.gray(e.verdict)}`);
  });
  console.log(colors.gray('\nMuat ulang: npm run cli -- --history <nomor> | Kosongkan: --history clear'));
}

// ── Mode: batch ──────────────────────────────────────────────────────────────
async function runBatch() {
  let links;
  try {
    links = await readBatch(String(options.batch));
  } catch (err) {
    console.log(colors.red(`✗ ${err.message}`));
    process.exitCode = 1;
    return;
  }
  if (links.length === 0) {
    console.log(colors.yellow('Tidak ada baris data di file batch.'));
    return;
  }

  const rows = [];
  const results = [];
  for (const link of links) {
    const result = calculate(link.topology);
    const enriched = { name: link.name, ...result };
    results.push(enriched);
    rows.push(enriched);
  }
  renderBatchTable(rows);

  const failed = results.filter((r) => r.verdict === 'fail').length;
  const marginal = results.filter((r) => r.verdict === 'marginal').length;
  console.log(colors.gray(`Total ${results.length} link — ${colors.green(`${results.length - failed - marginal} layak`)} / ${colors.yellow(`${marginal} marginal`)} / ${colors.red(`${failed} gagal`)}\n`));

  await maybeCopyAndSave(results[0], options);
  if (options.out) {
    await writeFile(options.out, JSON.stringify(results, null, 2), 'utf8');
    console.log(colors.green(`  ✓ Rekap JSON tersimpan ke ${options.out}`));
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
function createIo() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return { rl, prompter: createPrompter(rl) };
}

async function main() {
  if (options.batch) return runBatch();
  if (options.history) {
    const { rl, prompter } = createIo();
    try {
      return await runHistory(prompter);
    } finally {
      rl.close();
    }
  }
  if (options.tx != null) return runOneShot();

  // Default: wizard interaktif dengan loop menu
  const { rl, prompter } = createIo();
  try {
    displayBanner();
    for (;;) {
      await runWizard(prompter);
      const action = await prompter.ask('Hitung lagi? (y = ya / s = simpan ringkasan ke file / n = keluar):', {
        transform: (v) => v.toLowerCase(),
        validate: (v) => (['y', 's', 'n'].includes(v) ? undefined : 'jawab y, s, atau n'),
      });
      if (action === 'n') break;
      if (action === 's') {
        // Ringkasan hitungan terakhir disimpan ulang lewat maybeCopyAndSave pada putaran berikutnya;
        // simpan langsung dari riwayat terakhir agar sederhana.
        const [last] = await listEntries(1);
        const file = `laporan-${new Date().toISOString().slice(0, 10)}.txt`;
        await writeFile(file, buildSummary(calculate(last.topology)), 'utf8');
        console.log(colors.green(`  ✓ Ringkasan tersimpan ke ${file}\n`));
      }
    }
    console.log(colors.cyan('Terima kasih telah menggunakan Loss Kalkulator FO.\n'));
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(colors.red(`✗ ${err.message}`));
  process.exitCode = 1;
});
