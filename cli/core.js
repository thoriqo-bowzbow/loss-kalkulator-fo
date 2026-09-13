// Mesin hitung CLI v2 — murni fungsi tanpa I/O agar mudah dites.

export const WAVELENGTHS = [1310, 1490, 1550];

export const FIBER_TYPES = [
  { id: 'g652d', label: 'G.652.D (Standard)', attenuation: { 1310: 0.35, 1490: 0.31, 1550: 0.22 } },
  { id: 'g657a', label: 'G.657.A (Bend-insensitive)', attenuation: { 1310: 0.37, 1490: 0.33, 1550: 0.24 } },
  { id: 'g655', label: 'G.655 (NZ-DSF)', attenuation: { 1310: 0.4, 1490: 0.35, 1550: 0.25 } },
];

export const SPLITTERS = [
  { id: 'none', label: 'Direct', kind: 'uniform', loss: 0 },
  { id: 'plc-1x2', label: '1:2 PLC', kind: 'uniform', loss: 3.7 },
  { id: 'plc-1x4', label: '1:4 PLC', kind: 'uniform', loss: 7.2 },
  { id: 'plc-1x8', label: '1:8 PLC', kind: 'uniform', loss: 10.5 },
  { id: 'plc-1x16', label: '1:16 PLC', kind: 'uniform', loss: 13.5 },
  { id: 'plc-1x32', label: '1:32 PLC', kind: 'uniform', loss: 17.0 },
  { id: 'plc-1x64', label: '1:64 PLC', kind: 'uniform', loss: 20.5 },
  { id: 'fbt-50-50', label: '50:50 FBT', kind: 'ratio', lossMain: 3.4, lossTap: 3.4, ratio: 50 },
  { id: 'fbt-60-40', label: '60:40 FBT', kind: 'ratio', lossMain: 2.6, lossTap: 4.4, ratio: 60 },
  { id: 'fbt-70-30', label: '70:30 FBT', kind: 'ratio', lossMain: 1.9, lossTap: 5.5, ratio: 70 },
  { id: 'fbt-80-20', label: '80:20 FBT', kind: 'ratio', lossMain: 1.3, lossTap: 7.3, ratio: 80 },
  { id: 'fbt-85-15', label: '85:15 FBT', kind: 'ratio', lossMain: 1.0, lossTap: 9.5, ratio: 85 },
  { id: 'fbt-90-10', label: '90:10 FBT', kind: 'ratio', lossMain: 0.7, lossTap: 10.8, ratio: 90 },
  { id: 'fbt-95-5', label: '95:5 FBT', kind: 'ratio', lossMain: 0.5, lossTap: 14.5, ratio: 95 },
  { id: 'fbt-99-1', label: '99:1 FBT', kind: 'ratio', lossMain: 0.3, lossTap: 21.0, ratio: 99 },
];

export const OPTICAL_CLASSES = [
  { id: 'custom', label: 'Custom' },
  { id: 'gpon-bplus', label: 'GPON Class B+', tx: 7, rx: -27 },
  { id: 'gpon-cplus', label: 'GPON Class C+', tx: 10, rx: -30 },
  { id: 'xgs-n1', label: 'XGS-PON N1', tx: 8, rx: -28 },
  { id: 'xgs-n2', label: 'XGS-PON N2', tx: 10, rx: -30 },
];

export const SPLICE_LOSS = 0.1;
export const CONNECTOR_LOSS = 0.3;
export const MARGIN_OK_THRESHOLD = 3;

export function getFiberType(id) {
  return FIBER_TYPES.find((f) => f.id === id) ?? FIBER_TYPES[0];
}

export function getSplitter(id) {
  if (!id) return null;
  const byId = SPLITTERS.find((s) => s.id === id);
  if (byId) return byId;
  // Terima label juga: "1:8", "1:8 PLC", "60:40 fbt", dsb.
  const key = String(id).trim().toLowerCase();
  return (
    SPLITTERS.find((s) => s.label.toLowerCase() === key) ??
    SPLITTERS.find((s) => s.label.toLowerCase().replace(/ (plc|fbt)$/, '') === key) ??
    null
  );
}

export function getOpticalClass(id) {
  return OPTICAL_CLASSES.find((c) => c.id === id) ?? OPTICAL_CLASSES[0];
}

export function splitterLossFor(splitter, branch) {
  if (!splitter) return 0;
  if (splitter.kind === 'ratio') return branch === 'tap' ? splitter.lossTap : splitter.lossMain;
  return splitter.loss;
}

/** Negative & non-finite → 0; above max → max. */
export function clampNumber(value, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), max);
}

export function verdictOf(margin) {
  if (margin >= MARGIN_OK_THRESHOLD) return 'ok';
  if (margin > 0) return 'marginal';
  return 'fail';
}

/**
 * @param {object} topology { tx, rx, wavelength, fiberTypeId, segments: [{ name, km, splice, conn, splitterId }] }
 * @returns result: breakdown per segment, cumulative power trail, FBT taps, margin, verdict, recommendation
 */
export function calculate(topology) {
  const fiberType = getFiberType(topology.fiberTypeId);
  const attenuation = fiberType.attenuation[topology.wavelength] ?? fiberType.attenuation[1310];

  const segmentResults = [];
  const taps = [];
  let cumulative = 0;

  for (const seg of topology.segments) {
    const splitter = getSplitter(seg.splitterId);
    const cableLoss = clampNumber(seg.km, 500) * attenuation;
    const spliceLoss = clampNumber(seg.splice, 1000) * SPLICE_LOSS;
    const connectorLoss = clampNumber(seg.conn, 1000) * CONNECTOR_LOSS;
    const splitterLoss = splitter ? splitterLossFor(splitter, 'main') : 0;
    const totalLoss = cableLoss + spliceLoss + connectorLoss + splitterLoss;
    cumulative += totalLoss;
    const powerAtEnd = topology.tx - cumulative;

    segmentResults.push({
      name: seg.name || 'SEG',
      cableLoss,
      spliceLoss,
      connectorLoss,
      splitterLoss: splitter ? splitterLoss : null,
      splitterLabel: splitter && splitter.id !== 'none' ? splitter.label : null,
      totalLoss,
      cumulativeLoss: cumulative,
      powerAtEnd,
    });

    if (splitter && splitter.kind === 'ratio') {
      taps.push({
        splitterLabel: splitter.label,
        segmentName: segmentResults[segmentResults.length - 1].name,
        power: powerAtEnd - splitterLossFor(splitter, 'tap') + splitterLossFor(splitter, 'main'),
      });
    }
  }

  const endpointPower = segmentResults.length > 0 ? segmentResults[segmentResults.length - 1].powerAtEnd : topology.tx;
  const tapPowers = taps.map((t) => t.power);
  const worstPower = Math.min(endpointPower, ...tapPowers);
  const totalLoss = topology.tx - worstPower;
  const margin = worstPower - topology.rx;
  const verdict = verdictOf(margin);

  return {
    tx: topology.tx,
    rx: topology.rx,
    wavelength: topology.wavelength,
    fiberType,
    segments: segmentResults,
    taps,
    totalLoss,
    powerReceived: worstPower,
    margin,
    verdict,
    recommendation: recommend(verdict, contributionTotals(segmentResults)),
  };
}

function contributionTotals(segments) {
  return segments.reduce(
    (acc, s) => {
      acc.cable += s.cableLoss;
      acc.splice += s.spliceLoss;
      acc.connector += s.connectorLoss;
      acc.splitter += s.splitterLoss ?? 0;
      return acc;
    },
    { cable: 0, splice: 0, connector: 0, splitter: 0 },
  );
}

function biggestContributor(totals) {
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
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

function recommend(verdict, totals) {
  if (verdict === 'ok') return RECOMMENDATIONS.ok;
  if (verdict === 'marginal') return RECOMMENDATIONS.marginal;
  const biggest = biggestContributor(totals);
  return `Link GAGAL. ${FAIL_RECOMMENDATIONS[biggest] ?? 'Sinyal di bawah sensitivity RX.'}`;
}

/** Ringkasan teks polos multi-baris, siap di-copy/paste. */
export function buildSummary(result) {
  const lines = [
    '== Link Budget Report ==',
    `TX: ${result.tx.toFixed(2)} dBm | RX sens: ${result.rx.toFixed(2)} dBm`,
    `${result.wavelength} nm | ${result.fiberType.label}`,
    '',
    ...result.segments.map(
      (s, i) =>
        `${i + 1}. ${s.name}: -${s.totalLoss.toFixed(2)} dB → ${s.powerAtEnd.toFixed(2)} dBm${s.splitterLabel ? ` [${s.splitterLabel}]` : ''}`,
    ),
    ...result.taps.map((t) => `TAP ${t.splitterLabel} @ ${t.segmentName}: ${t.power.toFixed(2)} dBm`),
    '',
    `Weakest    : ${result.powerReceived.toFixed(2)} dBm`,
    `Margin     : ${result.margin >= 0 ? '+' : ''}${result.margin.toFixed(2)} dB (${verdictLabel(result.verdict)})`,
  ];
  return lines.join('\n');
}

export function verdictLabel(verdict) {
  return { ok: 'LAYAK', marginal: 'MARGINAL', fail: 'GAGAL' }[verdict];
}
