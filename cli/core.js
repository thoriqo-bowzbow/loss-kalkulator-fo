/**
 * CLI glue di atas shared engine — satu sumber kebenaran bersama web.
 * Yang hidup di sini hanya hal spesifik CLI: lookup splitter by label,
 * ringkasan teks, dan string rekomendasi Bahasa Indonesia.
 */

import { biggestContributor as sharedBiggestContributor, calculate as sharedCalculate } from '../shared/calculator.js';
import { DEFAULT_SPLITTERS, FIBER_TYPES, OPTICAL_CLASSES, WAVELENGTHS } from '../shared/constants.js';

export { WAVELENGTHS, OPTICAL_CLASSES, FIBER_TYPES };

/** Katalog splitter (sama dengan web). */
export const SPLITTERS = DEFAULT_SPLITTERS;

export { biggestContributor as sharedBiggestContributor, getOpticalClass, verdictOf } from '../shared/calculator.js';

export function verdictLabel(verdict) {
  return { ok: 'LAYAK', marginal: 'MARGINAL', fail: 'GAGAL' }[verdict];
}

/**
 * getSplitter versi CLI: menerima id maupun label ("1:8", "1:8 PLC", "60:40 fbt").
 */
export function lookupSplitter(id) {
  if (!id) return null;
  const byId = SPLITTERS.find((s) => s.id === id);
  if (byId) return byId;
  const key = String(id).trim().toLowerCase();
  return (
    SPLITTERS.find((s) => s.label.toLowerCase() === key) ??
    SPLITTERS.find((s) => s.label.toLowerCase().replace(/ (plc|fbt)$/, '') === key) ??
    null
  );
}

const RECOMMENDATIONS = {
  ok: 'Link layak. Margin cukup untuk degradasi jangka panjang.',
  marginal: 'Margin tipis. Pertimbangkan naikkan kelas optik atau kurangi loss fisik.',
};

const FAIL_RECOMMENDATIONS = {
  cable: 'Loss kabel dominan — perpendek jalur atau pindah ke 1550 nm.',
  splice: 'Loss splicing tinggi — periksa kualitas splice (standar 0.1 dB/titik).',
  connector: 'Loss konektor tinggi — periksa konektor kotor/rusak (standar 0.3 dB/pcs).',
  splitter: 'Loss splitter dominan — gunakan rasio lebih rendah atau kelas optik lebih tinggi.',
};

function recommend(result) {
  if (result.verdict === 'ok') return RECOMMENDATIONS.ok;
  if (result.verdict === 'marginal') return RECOMMENDATIONS.marginal;
  return `Link GAGAL. ${FAIL_RECOMMENDATIONS[sharedBiggestContributor(result)] ?? 'Sinyal di bawah sensitivity RX.'}`;
}

/** Ringkasan teks polos multi-baris, siap di-copy/paste. */
export function buildSummary(result) {
  const lines = [
    '== Link Budget Report ==',
    `TX: ${result.txPower.toFixed(2)} dBm | RX sens: ${result.rxSensitivity.toFixed(2)} dBm`,
    `${result.wavelength} nm | ${result.fiberType.label}`,
    '',
    ...result.segments.map(
      (s, i) =>
        `${i + 1}. ${s.name}: -${s.totalLoss.toFixed(2)} dB → ${s.powerAtEnd.toFixed(2)} dBm${
          s.splitterLabel && s.splitterLabel !== 'direct' ? ` [${s.splitterLabel}]` : ''
        }`,
    ),
    ...result.taps.map((t) => `TAP ${t.splitterLabel} @ ${t.segmentName}: ${t.power.toFixed(2)} dBm`),
    '',
    `Weakest    : ${result.powerReceived.toFixed(2)} dBm`,
    `Margin     : ${result.margin >= 0 ? '+' : ''}${result.margin.toFixed(2)} dB (${verdictLabel(result.verdict)})`,
  ];
  return lines.join('\n');
}

/**
 * Adapter topologi gaya CLI ({ tx, rx, km, ... }) → topologi shared engine.
 * Rantai linear: tiap segmen parent-nya segmen sebelumnya.
 */
export function buildTopology({ tx, rx, wavelength, fiberTypeId, segments }) {
  return {
    txPower: tx,
    rxSensitivity: rx,
    opticalClassId: null,
    wavelength,
    fiberTypeId,
    segments: segments.map((s, i) => ({
      id: `seg-${i}`,
      name: s.name,
      distanceKm: s.km,
      spliceCount: s.splice,
      connectorCount: s.conn,
      splitterId: s.splitterId,
      parentId: i > 0 ? `seg-${i - 1}` : null,
    })),
  };
}

/** Hitung dari topologi gaya CLI + tambahkan rekomendasi Bahasa Indonesia. */
export function calculate(topology) {
  const result = sharedCalculate(buildTopology(topology));
  return { ...result, recommendation: recommend(result) };
}
