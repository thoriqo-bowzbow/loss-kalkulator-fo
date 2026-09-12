import { describe, expect, it } from 'vitest';
import { biggestContributor, calculate, verdictOf } from './calculator';
import { DEFAULT_CONSTANTS } from './constants';
import type { Segment, Topology } from './types';

function makeTopology(segments: Segment[], overrides: Partial<Topology> = {}): Topology {
  return {
    txPower: 7,
    rxSensitivity: -27,
    opticalClassId: 'custom',
    wavelength: 1310,
    fiberTypeId: 'g652d',
    segments,
    ...overrides,
  };
}

// Legacy-style linear topology (no parentId — defaults to previous segment).
const LINEAR = [
  { id: 's1', name: 'FEEDER', distanceKm: 10, spliceCount: 5, connectorCount: 4, splitterId: 'plc-1x8' },
];

describe('calculate — linear (legacy) topologies', () => {
  it('matches the validated v1 reference case: 7 dBm, 10 km, 5 splice, 4 conn, 1:8 → -8.70 dBm', () => {
    const result = calculate(makeTopology(LINEAR));
    expect(result.totalLoss).toBeCloseTo(15.7, 5);
    expect(result.powerReceived).toBeCloseTo(-8.7, 5);
    expect(result.paths).toHaveLength(1);
    expect(result.taps).toHaveLength(0);
  });

  it('uses the attenuation of the selected wavelength (1550 nm → 0.22 dB/km)', () => {
    const result = calculate(makeTopology(LINEAR, { wavelength: 1550 }));
    // cable: 10 * 0.22 = 2.2, splice 0.5, conn 1.2, splitter 10.5 → 14.4
    expect(result.totalLoss).toBeCloseTo(14.4, 5);
  });

  it('computes a multi-segment topology cumulatively', () => {
    const result = calculate(
      makeTopology([
        { id: 'a', name: 'FEEDER', distanceKm: 4, spliceCount: 2, connectorCount: 2, splitterId: 'plc-1x8' },
        { id: 'b', name: 'DISTRIBUSI', distanceKm: 1, spliceCount: 1, connectorCount: 2, splitterId: 'plc-1x16' },
        { id: 'c', name: 'DROP', distanceKm: 0.2, spliceCount: 1, connectorCount: 2, splitterId: null },
      ]),
    );
    // seg a: 1.4 + 0.2 + 0.6 + 10.5 = 12.7
    expect(result.segments[0].cumulativeLoss).toBeCloseTo(12.7, 5);
    expect(result.segments[0].powerAtEnd).toBeCloseTo(7 - 12.7, 5);
    // seg b: 0.35 + 0.1 + 0.6 + 13.5 = 14.55
    expect(result.segments[1].cumulativeLoss).toBeCloseTo(12.7 + 14.55, 5);
    // seg c: 0.07 + 0.1 + 0.6 = 0.77
    expect(result.segments[2].cumulativeLoss).toBeCloseTo(12.7 + 14.55 + 0.77, 5);
    expect(result.powerReceived).toBeCloseTo(7 - 28.02, 5);
  });

  it('clamps negative and non-finite inputs to zero', () => {
    const result = calculate(
      makeTopology([{ id: 'x', name: 'X', distanceKm: -5, spliceCount: NaN, connectorCount: 2, splitterId: null }]),
    );
    expect(result.segments[0].cableLoss).toBe(0);
    expect(result.segments[0].spliceLoss).toBe(0);
    expect(result.segments[0].connectorLoss).toBeCloseTo(0.6, 5);
  });
});

describe('calculate — tree topologies', () => {
  it('branches ODP-1 and ODP-2 from the same ODC, not from each other', () => {
    const result = calculate(
      makeTopology([
        { id: 'odc', name: 'ODC-1', distanceKm: 2, spliceCount: 1, connectorCount: 2, splitterId: 'plc-1x8' },
        { id: 'odp1', name: 'ODP-1', distanceKm: 0.5, spliceCount: 0, connectorCount: 2, splitterId: 'plc-1x8', parentId: 'odc' },
        { id: 'odp2', name: 'ODP-2', distanceKm: 0.8, spliceCount: 1, connectorCount: 2, splitterId: 'plc-1x8', parentId: 'odc' },
      ]),
    );
    expect(result.paths).toHaveLength(2);

    const odp1 = result.paths.find((p) => p.label === 'ODP-1')!;
    const odp2 = result.paths.find((p) => p.label === 'ODP-2')!;

    // ODC cumulative: 0.7 + 0.1 + 0.6 + 10.5 = 11.9
    // ODP-1 own: 0.175 + 0.6 + 10.5 = 11.275
    expect(odp1.totalLoss).toBeCloseTo(11.9 + 11.275, 5);
    // ODP-2 branches from ODC too: its loss must NOT include ODP-1's own loss (11.275).
    // ODP-2 own: 0.28 + 0.1 + 0.6 + 10.5 = 11.48
    expect(odp2.totalLoss).toBeCloseTo(11.9 + 11.48, 5);
    // A linear chain would have stacked ODP-2 on top of ODP-1 (23.175 + 11.48 = 34.655).
    expect(odp2.totalLoss).toBeLessThan(34.655);
    expect(result.verdict).toBe('ok');
    // ODP-2 ends up weaker: longer cable and an extra splice than ODP-1.
    expect(odp2.powerReceived).toBeLessThan(odp1.powerReceived);
    expect(odp2.isWeakest).toBe(true);
    expect(odp1.isWeakest).toBe(false);
  });

  it('treats every leaf as an endpoint and skips intermediate power for paths', () => {
    const result = calculate(
      makeTopology([
        { id: 'a', name: 'A', distanceKm: 1, spliceCount: 0, connectorCount: 0, splitterId: null },
        { id: 'b', name: 'B', distanceKm: 1, spliceCount: 0, connectorCount: 0, splitterId: null, parentId: 'a' },
        { id: 'c', name: 'C', distanceKm: 1, spliceCount: 0, connectorCount: 0, splitterId: null, parentId: 'a' },
      ]),
    );
    // B and C are leaves; A is not (it has children).
    expect(result.paths.map((p) => p.label).sort()).toEqual(['B', 'C']);
    expect(result.paths[0].totalLoss).toBeCloseTo(0.7, 5);
  });

  it('reports FBT taps and counts them into the verdict', () => {
    const result = calculate(
      makeTopology(
        [{ id: 'a', name: 'FEEDER', distanceKm: 2, spliceCount: 1, connectorCount: 2, splitterId: 'fbt-60-40' }],
        { txPower: 5 },
      ),
    );
    // physical: 0.7 + 0.1 + 0.6 = 1.4 ; main: -2.6 → 1.0 dBm ; tap: -4.4 → -0.8 dBm
    expect(result.paths[0].powerReceived).toBeCloseTo(1.0, 5);
    expect(result.taps).toHaveLength(1);
    expect(result.taps[0].power).toBeCloseTo(-0.8, 5);
    // verdict references the weaker tap: -0.8 - (-27) = 26.2
    expect(result.margin).toBeCloseTo(26.2, 5);
    expect(result.powerReceived).toBeCloseTo(-0.8, 5);
  });

  it('tolerates parentId pointing to an unknown or later segment (falls back to legacy chain)', () => {
    const result = calculate(
      makeTopology([
        { id: 'a', name: 'A', distanceKm: 1, spliceCount: 0, connectorCount: 0, splitterId: null },
        { id: 'b', name: 'B', distanceKm: 1, spliceCount: 0, connectorCount: 0, splitterId: null, parentId: 'ghost' },
      ]),
    );
    // 'ghost' is unknown → falls back to previous segment (linear).
    expect(result.segments[1].cumulativeLoss).toBeCloseTo(0.7, 5);
  });
});

describe('verdictOf', () => {
  it('classifies margin thresholds', () => {
    expect(verdictOf(5)).toBe('ok');
    expect(verdictOf(3)).toBe('ok');
    expect(verdictOf(2.9)).toBe('marginal');
    expect(verdictOf(0.1)).toBe('marginal');
    expect(verdictOf(0)).toBe('fail');
    expect(verdictOf(-2)).toBe('fail');
  });
});

describe('biggestContributor', () => {
  it('identifies the splitter in the reference case', () => {
    const result = calculate(makeTopology(LINEAR));
    expect(biggestContributor(result)).toBe('splitter');
  });

  it('identifies cable on a long run without splitter', () => {
    const result = calculate(
      makeTopology([{ id: 'a', name: 'LONG', distanceKm: 50, spliceCount: 2, connectorCount: 1, splitterId: null }]),
    );
    expect(biggestContributor(result)).toBe('cable');
  });
});

describe('constants override', () => {
  it('uses custom splice/connector losses', () => {
    const result = calculate(makeTopology(LINEAR), {
      ...DEFAULT_CONSTANTS,
      spliceLoss: 0.2,
      connectorLoss: 0.5,
    });
    // cable 3.5 + splice 1.0 + conn 2.0 + splitter 10.5 = 17.0
    expect(result.totalLoss).toBeCloseTo(17.0, 5);
  });
});
