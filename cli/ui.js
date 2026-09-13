// UI terminal: warna ANSI (hanya yang dipakai), banner, prompt, tabel hasil.

import { FIBER_TYPES, OPTICAL_CLASSES, SPLITTERS, getOpticalClass } from './core.js';

const Fg = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  mint: '\x1b[92m',
  red: '\x1b[91m',
  gray: '\x1b[90m',
};

const colorEnabled = process.stdout.isTTY && !process.argv.includes('--plain');

/** Bungkus teks dengan kode ANSI; tanpa warna bila bukan TTY atau --plain. */
const c = (code, text) => (colorEnabled ? `${code}${text}${Fg.reset}` : String(text));

export const colors = {
  mint: (t) => c(Fg.mint + Fg.bright, t),
  yellow: (t) => c(Fg.yellow + Fg.bright, t),
  cyan: (t) => c(Fg.cyan, t),
  green: (t) => c(Fg.green, t),
  red: (t) => c(Fg.red + Fg.bright, t),
  gray: (t) => c(Fg.dim, t),
  bold: (t) => c(Fg.bright, t),
  dim: (t) => c(Fg.dim, t),
};

export function displayBanner() {
  console.log(colors.cyan('╔══════════════════════════════════════════╗'));
  console.log(colors.cyan('║ ') + colors.mint('LOSS KALKULATOR FO') + colors.gray('  CLI v2.0'.padEnd(20)) + colors.cyan('║'));
  console.log(colors.cyan('╚══════════════════════════════════════════╝'));
  console.log(colors.gray('Kalkulator loss fiber optik multi-segmen\n'));
}

/** Bersihkan layar (hanya pada TTY; dilewati saat --plain agar log tetap utuh). */
export function clearScreen() {
  if (colorEnabled && process.stdout.isTTY) process.stdout.write('\x1b[2J\x1b[H');
}

/** Ringkasan singkat konfigurasi yang sudah dipilih — tampil di atas setiap langkah wizard. */
export function renderProgressSummary(topology, segments = []) {
  const cls = topology.opticalClassId && topology.opticalClassId !== 'custom' ? ` (${getOpticalClass(topology.opticalClassId).label})` : '';
  console.log(colors.gray('─'.repeat(44)));
  console.log(`  TX ${colors.yellow(String(topology.tx))} dBm · RX ${colors.yellow(String(topology.rx))} dBm · ${topology.wavelength} nm${cls}`);
  const fiber = FIBER_TYPES.find((f) => f.id === topology.fiberTypeId) ?? FIBER_TYPES[0];
  console.log(`  Fiber: ${fiber.label}`);
  if (segments.length > 0) {
    segments.forEach((s, i) => {
      const splitter = SPLITTERS.find((sp) => sp.id === s.splitterId);
      const splitterLabel = splitter && splitter.id !== 'none' ? splitter.label : 'Direct';
      console.log(`  ${colors.gray(`${i + 1}.`)} ${colors.bold(s.name)}  ${colors.gray(`${s.km} km · ${s.splice} splice · ${s.conn} konektor · ${splitterLabel}`)}`);
    });
  } else {
    console.log(colors.gray('  (belum ada segmen)'));
  }
  console.log(colors.gray('─'.repeat(44)));
}

/**
 * Prompter berbasis event 'line' — bukan rl.question(), yang berperilaku
 * tidak konsisten untuk input piped. Baris yang datang lebih cepat dari
 * prompt di-buffer sehingga urutan jawaban selalu benar.
 */
export function createPrompter(rl) {
  const buffer = [];
  const waiters = [];
  rl.on('line', (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else buffer.push(line);
  });
  rl.on('close', () => {
    while (waiters.length > 0) waiters.shift()(null);
  });

  return {
    /** Prompt yang menolak input kosong dan mengulang sampai valid. */
    async ask(question, { validate, transform = (v) => v } = {}) {
      for (;;) {
        // setPrompt + prompt() membuat readline mengelola baris input
        // (backspace tidak ikut menghapus teks pertanyaan).
        rl.setPrompt(colors.cyan('❓ ') + question + ' ');
        rl.prompt();
        const raw = buffer.length > 0 ? buffer.shift() : await new Promise((resolve) => waiters.push(resolve));
        if (raw === null) throw new Error('Input berakhir sebelum selesai (EOF).');
        const value = transform(raw.trim());
        if (validate) {
          const err = validate(value, raw);
          if (err) {
            console.log(colors.red(`  ✗ ${err}`));
            continue;
          }
        }
        return value;
      }
    },
    close() {
      rl.close();
    },
  };
}

/** Angka desimal; terima koma ("0,5"); null jika bukan angka. */
export function parseDecimal(raw) {
  if (raw === '') return null;
  const n = Number.parseFloat(raw.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

const VERDICT_COLORS = {
  ok: (t) => colors.green(t),
  marginal: (t) => colors.yellow(t),
  fail: (t) => colors.red(t),
};

const VERDICT_LABELS = { ok: 'LAYAK', marginal: 'MARGINAL', fail: 'GAGAL' };

/** Bar ASCII 30 kolom dari -6 dB (kiri) ke +12 dB (kanan), penanda di 0 dB. */
function marginBar(margin) {
  const width = 30;
  const min = -6;
  const max = 12;
  const clamped = Math.min(Math.max(margin, min), max);
  const pos = Math.round(((clamped - min) / (max - min)) * (width - 1));
  const zeroPos = Math.round(((0 - min) / (max - min)) * (width - 1));
  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i === pos) bar += colors.bold('▮');
    else if (i === zeroPos) bar += colors.gray('│');
    else bar += i < zeroPos ? colors.red('─') : colors.green('─');
  }
  return bar;
}

const fmt = (v, unit) => `${v.toFixed(2)} ${unit}`;

/** Cetak hasil lengkap ke terminal. */
export function renderResult(result) {
  const line = colors.dim('─'.repeat(44));
  const p = (t = '') => console.log(t);

  p();
  p(colors.bold('═══ HASIL PERHITUNGAN ═══'));
  p();
  p(`  TX Power       : ${colors.yellow(fmt(result.txPower, 'dBm'))}`);
  p(`  RX Sensitivity : ${fmt(result.rxSensitivity, 'dBm')}`);
  p(`  Gelombang      : ${result.wavelength} nm`);
  p(`  Tipe Fiber     : ${result.fiberType.label}`);
  p();
  p(line);
  p(colors.bold('BREAKDOWN PER SEGMEN:'));
  p();

  result.segments.forEach((s, i) => {
    p(`  ${i + 1}. ${colors.bold(s.name)}`);
    p(`     Kabel        : -${fmt(s.cableLoss, 'dB')}`);
    p(`     Splicing     : -${fmt(s.spliceLoss, 'dB')}`);
    p(`     Konektor     : -${fmt(s.connectorLoss, 'dB')}`);
    if (s.splitterLabel) p(`     Splitter     : -${fmt(s.splitterLoss ?? 0, 'dB')} ${colors.gray(`(${s.splitterLabel})`)}`);
    p(`     Total        : -${fmt(s.totalLoss, 'dB')}  ${colors.gray(`(kumulatif ${fmt(s.cumulativeLoss, 'dB')})`)}`);
    p(`     Power keluar : ${colors.yellow(colors.bold(fmt(s.powerAtEnd, 'dBm')))}`);
    p();
  });

  for (const t of result.taps) {
    p(`  ${colors.cyan('TAP')} ${t.splitterLabel} @ ${t.segmentName}: ${colors.yellow(colors.bold(fmt(t.power, 'dBm')))}`);
  }
  if (result.taps.length > 0) p();

  p(line);
  p(`  TOTAL LOSS     : -${fmt(result.totalLoss, 'dB')}`);
  p(`  POWER TERLEMAH : ${fmt(result.powerReceived, 'dBm')}`);
  p(`  MARGIN         : ${colors.bold(colors.mint(`${result.margin >= 0 ? '+' : ''}${fmt(result.margin, 'dB')}`))}`);
  p();
  p(`  ${marginBar(result.margin)}`);
  p(`  ${colors.gray('-6 dB                      +12 dB')}`);
  p();
  p(VERDICT_COLORS[result.verdict](`  ■ ${VERDICT_LABELS[result.verdict]}`));
  p();
  p(`  ${colors.cyan('ℹ REKOMENDASI:')} ${result.recommendation}`);
  p();
}

/** Tabel rekap mode batch. */
export function renderBatchTable(rows) {
  const widths = [4, 20, 9, 10, 9, 10];
  const divider = widths.map((w) => '─'.repeat(w)).join(colors.dim('┼'));
  const row = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i]).slice(0, widths[i])).join(colors.dim(' │ '));

  console.log(row(['NO', 'NAMA', 'LOSS', 'POWER', 'MARGIN', 'VERDICT']));
  console.log(divider);
  rows.forEach((r, i) => {
    console.log(
      row([
        i + 1,
        r.name,
        `-${r.totalLoss.toFixed(2)}`,
        r.powerReceived.toFixed(2),
        `${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(2)}`,
        VERDICT_COLORS[r.verdict](VERDICT_LABELS[r.verdict]),
      ]),
    );
  });
  console.log();
}
