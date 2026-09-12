import { DEFAULT_CONSTANTS, MARGIN_OK_THRESHOLD, OPTICAL_CLASSES } from './constants';
import type {
  CalcResult,
  FiberType,
  LossConstants,
  PathResult,
  Segment,
  SegmentResult,
  Splitter,
  Topology,
  Verdict,
} from './types';

export function getFiberType(constants: LossConstants, id: string): FiberType {
  return constants.fiberTypes.find((f) => f.id === id) ?? constants.fiberTypes[0];
}

export function getSplitter(constants: LossConstants, id: string | null): Splitter | null {
  if (!id) return null;
  return constants.splitters.find((s) => s.id === id) ?? null;
}

export function getOpticalClass(id: string | null) {
  return OPTICAL_CLASSES.find((c) => c.id === id) ?? OPTICAL_CLASSES[0];
}

export function clampNumber(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), max);
}

function splitterLossFor(splitter: Splitter, branch: 'main' | 'tap'): number {
  if (splitter.kind === 'ratio') {
    return branch === 'main' ? (splitter.loss1 ?? 0) : (splitter.loss2 ?? 0);
  }
  return splitter.loss ?? 0;
}

/**
 * Computes the full link budget for a topology tree.
 *
 * Each segment branches from its `parentId` (or, when absent, from the
 * previous segment in the array — legacy linear behaviour). Every endpoint
 * (a segment no other segment branches from) yields one path whose loss is
 * accumulated along its parent chain. FBT ratio splitters additionally
 * produce a tapped output reported in `taps`. Margin & verdict reference the
 * weakest signal among all endpoint paths and taps.
 */
export function calculate(topology: Topology, constants: LossConstants = DEFAULT_CONSTANTS): CalcResult {
  const fiberType = getFiberType(constants, topology.fiberTypeId);
  const attenuation = fiberType.attenuation[topology.wavelength];

  const segments = topology.segments;
  const indexById = new Map(segments.map((s, idx) => [s.id, idx]));
  const byId = new Map(segments.map((s) => [s.id, s]));

  // Parent may sit anywhere in the array (list order is cosmetic); cycle-guarded upstream.
  const parentOf = (s: Segment): Segment | null => {
    if (s.parentId != null) {
      const parent = byId.get(s.parentId);
      if (parent) return parent;
    }
    // No (valid) parent: legacy behaviour — continue from the previous segment.
    const idx = indexById.get(s.id) ?? 0;
    return idx > 0 ? segments[idx - 1] : null;
  };

  // Per-segment own losses (main branch) and cumulative chain loss.
  const ownLoss = new Map<string, number>();
  const detail = new Map<string, Omit<SegmentResult, 'cumulativeLoss' | 'powerAtEnd'>>();
  const cumulative = new Map<string, number>();

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

  const resolveCumulative = (segment: Segment, seen: Set<string> = new Set()): number => {
    const cached = cumulative.get(segment.id);
    if (cached != null) return cached;
    seen.add(segment.id);
    const parent = parentOf(segment);
    const base = parent && !seen.has(parent.id) ? resolveCumulative(parent, seen) : 0;
    const total = base + (ownLoss.get(segment.id) ?? 0);
    cumulative.set(segment.id, total);
    return total;
  };

  const segmentResults = new Map<string, SegmentResult>();
  segments.forEach((segment) => {
    const cum = resolveCumulative(segment);
    segmentResults.set(segment.id, {
      ...detail.get(segment.id)!,
      cumulativeLoss: cum,
      powerAtEnd: topology.txPower - cum,
    });
  });

  // Endpoints: segments that are nobody's parent.
  const parentIds = new Set(segments.map(parentOf).filter((p): p is Segment => p !== null).map((p) => p.id));
  const endpoints = segments.filter((s) => !parentIds.has(s.id));
  if (endpoints.length === 0 && segments.length > 0) endpoints.push(segments[segments.length - 1]);

  const chainOf = (segment: Segment): Segment[] => {
    const chain: Segment[] = [];
    let current: Segment | null = segment;
    while (current) {
      chain.unshift(current);
      current = parentOf(current);
      if (chain.some((c) => c.id === current?.id)) break; // cycle guard
    }
    return chain;
  };

  const paths: PathResult[] = endpoints.map((endpoint) => {
    const chain = chainOf(endpoint).map((s) => segmentResults.get(s.id)!);
    const totalLoss = chain.length > 0 ? chain[chain.length - 1].cumulativeLoss : 0;
    return {
      label: endpoint.name || `#${(indexById.get(endpoint.id) ?? 0) + 1}`,
      segments: chain,
      totalLoss,
      powerReceived: topology.txPower - totalLoss,
      isWeakest: false,
    };
  });

  // FBT taps: tapped-branch power right at each ratio splitter.
  const taps = segments.flatMap((segment) => {
    const splitter = getSplitter(constants, segment.splitterId);
    if (!splitter || splitter.kind !== 'ratio') return [];
    const mainPower = segmentResults.get(segment.id)!.powerAtEnd;
    return [
      {
        segmentName: segment.name || `#${(indexById.get(segment.id) ?? 0) + 1}`,
        splitterLabel: splitter.label,
        power: mainPower - splitterLossFor(splitter, 'tap') + splitterLossFor(splitter, 'main'),
      },
    ];
  });

  // Weakest reference = lowest power among endpoint paths and taps.
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

export function verdictOf(margin: number): Verdict {
  if (margin >= MARGIN_OK_THRESHOLD) return 'ok';
  if (margin > 0) return 'marginal';
  return 'fail';
}

/** Returns the largest single loss contributor across all segments, for recommendations. */
export function biggestContributor(result: CalcResult): 'cable' | 'splice' | 'connector' | 'splitter' {
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
  const entries = Object.entries(totals) as [keyof typeof totals, number][];
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}
