/**
 * Mesin hitung link budget — sumber tunggal untuk web & CLI.
 * Topologi berbentuk pohon: setiap segmen bercabang dari parentId-nya
 * (atau dari segmen sebelumnya bila parentId kosong — perilaku legacy linear).
 */

import { DEFAULT_CONSTANTS, MARGIN_OK_THRESHOLD, OPTICAL_CLASSES } from './constants.js';

/** @typedef {import('./types').CalcResult} CalcResult */
/** @typedef {import('./types').LossConstants} LossConstants */
/** @typedef {import('./types').Segment} Segment */
/** @typedef {import('./types').SegmentResult} SegmentResult */
/** @typedef {import('./types').Topology} Topology */

export function getFiberType(constants, id) {
  return constants.fiberTypes.find((f) => f.id === id) ?? constants.fiberTypes[0];
}

export function getSplitter(constants, id) {
  if (!id) return null;
  return constants.splitters.find((s) => s.id === id) ?? null;
}

export function getOpticalClass(id) {
  return OPTICAL_CLASSES.find((c) => c.id === id) ?? OPTICAL_CLASSES[0];
}

export function clampNumber(value, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), max);
}

function splitterLossFor(splitter, branch) {
  if (!splitter) return 0;
  if (splitter.kind === 'ratio') return branch === 'tap' ? (splitter.loss2 ?? 0) : (splitter.loss1 ?? 0);
  return splitter.loss ?? 0;
}

export function calculate(topology, constants = DEFAULT_CONSTANTS) {
  const fiberType = getFiberType(constants, topology.fiberTypeId);
  const attenuation = fiberType.attenuation[topology.wavelength];

  const segments = topology.segments;
  const indexById = new Map(segments.map((s, idx) => [s.id, idx]));
  const byId = new Map(segments.map((s) => [s.id, s]));

  // Parent boleh berada di indeks mana pun (urutan array bersifat kosmetik);
  // guard siklus ditangani resolveCumulative & chainOf.
  const parentOf = (s) => {
    if (s.parentId != null) {
      const parent = byId.get(s.parentId);
      if (parent) return parent;
    }
    // Tanpa parent valid: perilaku legacy — lanjut dari segmen sebelumnya.
    const idx = indexById.get(s.id) ?? 0;
    return idx > 0 ? segments[idx - 1] : null;
  };

  const ownLoss = new Map();
  const detail = new Map();
  const cumulative = new Map();

  segments.forEach((segment) => {
    const splitter = getSplitter(constants, segment.splitterId);
    const cableLoss = clampNumber(segment.distanceKm, 500) * attenuation;
    const spliceLoss = clampNumber(segment.spliceCount, 1000) * constants.spliceLoss;
    const connectorLoss = clampNumber(segment.connectorCount, 1000) * constants.connectorLoss;
    const splitterLoss = splitter ? splitterLossFor(splitter, 'main') : null;
    const totalLoss = cableLoss + spliceLoss + connectorLoss + (splitterLoss ?? 0);

    ownLoss.set(segment.id, totalLoss);
    detail.set(segment.id, {
      segmentId: segment.id,
      name: segment.name,
      cableLoss,
      spliceLoss,
      connectorLoss,
      splitterLoss,
      totalLoss,
      splitter,
    });
  });

  const resolveCumulative = (segment, seen = new Set()) => {
    const cached = cumulative.get(segment.id);
    if (cached != null) return cached;
    seen.add(segment.id);
    const parent = parentOf(segment);
    const base = parent && !seen.has(parent.id) ? resolveCumulative(parent, seen) : 0;
    const total = base + (ownLoss.get(segment.id) ?? 0);
    cumulative.set(segment.id, total);
    return total;
  };

  const segmentResults = new Map();
  segments.forEach((segment) => {
    const cum = resolveCumulative(segment);
    segmentResults.set(segment.id, {
      ...detail.get(segment.id),
      cumulativeLoss: cum,
      powerAtEnd: topology.txPower - cum,
    });
  });

  // Endpoint: segmen yang tidak menjadi parent siapa pun.
  const parentIds = new Set(segments.map(parentOf).filter((p) => p !== null).map((p) => p.id));
  const endpoints = segments.filter((s) => !parentIds.has(s.id));
  if (endpoints.length === 0 && segments.length > 0) endpoints.push(segments[segments.length - 1]);

  const chainOf = (segment) => {
    const chain = [];
    let current = segment;
    while (current) {
      chain.unshift(current);
      const next = parentOf(current);
      if (chain.some((c) => c.id === next?.id)) break; // guard siklus
      current = next;
    }
    return chain;
  };

  const paths = endpoints.map((endpoint) => {
    const chain = chainOf(endpoint).map((s) => segmentResults.get(s.id));
    const totalLoss = chain.length > 0 ? chain[chain.length - 1].cumulativeLoss : 0;
    return {
      label: endpoint.name || `#${(indexById.get(endpoint.id) ?? 0) + 1}`,
      segments: chain,
      totalLoss,
      powerReceived: topology.txPower - totalLoss,
      isWeakest: false,
    };
  });

  // Tap FBT: daya cabang lemah tepat di splitter ratio.
  const taps = segments.flatMap((segment) => {
    const splitter = getSplitter(constants, segment.splitterId);
    if (!splitter || splitter.kind !== 'ratio') return [];
    const mainPower = segmentResults.get(segment.id).powerAtEnd;
    return [
      {
        segmentName: segment.name || `#${(indexById.get(segment.id) ?? 0) + 1}`,
        splitterLabel: splitter.label,
        power: mainPower - splitterLossFor(splitter, 'tap') + splitterLossFor(splitter, 'main'),
      },
    ];
  });

  // Referensi terlemah = power terendah di antara jalur endpoint & tap.
  const tapPowers = taps.map((t) => t.power);
  const worstPower = Math.min(...paths.map((p) => p.powerReceived), ...tapPowers, topology.txPower);
  paths.forEach((p) => {
    p.isWeakest = p.powerReceived === worstPower;
  });

  const totalLoss = topology.txPower - worstPower;
  const margin = worstPower - topology.rxSensitivity;

  return {
    txPower: topology.txPower,
    rxSensitivity: topology.rxSensitivity,
    wavelength: topology.wavelength,
    fiberType,
    paths,
    taps,
    segments: [...segmentResults.values()],
    totalLoss,
    powerReceived: worstPower,
    margin,
    verdict: verdictOf(margin),
  };
}

export function verdictOf(margin) {
  if (margin >= MARGIN_OK_THRESHOLD) return 'ok';
  if (margin > 0) return 'marginal';
  return 'fail';
}

/** Kontributor loss tunggal terbesar di seluruh segmen, untuk rekomendasi. */
export function biggestContributor(result) {
  const totals = result.segments.reduce(
    (acc, s) => {
      acc.cable += s.cableLoss;
      acc.splice += s.spliceLoss;
      acc.connector += s.connectorLoss;
      acc.splitter += s.splitterLoss ?? 0;
      return acc;
    },
    { cable: 0, splice: 0, connector: 0, splitter: 0 },
  );
  const entries = Object.entries(totals);
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}
