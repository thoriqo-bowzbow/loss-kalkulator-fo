export type Wavelength = 1310 | 1490 | 1550;

export interface FiberType {
  id: string;
  label: string;
  attenuation: Record<Wavelength, number>;
}

export type SplitterKind = 'uniform' | 'ratio';

export interface Splitter {
  id: string;
  kind: SplitterKind;
  label: string;
  /** Loss applied to every output (PLC / uniform splitters). */
  loss?: number;
  /** Loss of the main (high-power) output for FBT ratio splitters. */
  loss1?: number;
  /** Loss of the tapped (low-power) output for FBT ratio splitters. */
  loss2?: number;
  /** Main-branch percentage, e.g. 60 for a 60:40 FBT splitter. */
  ratio?: number;
}

export interface Segment {
  id: string;
  name: string;
  distanceKm: number;
  spliceCount: number;
  connectorCount: number;
  /** Splitter installed at the end of this segment, or null. */
  splitterId: string | null;
  /**
   * Segment this one branches from. null/undefined = continues from the OLT
   * (first segment) — when absent, the previous segment in the array is used,
   * which keeps legacy linear topologies working.
   */
  parentId?: string | null;
}

export interface OpticalClass {
  id: string;
  label: string;
  txPower: number;
  txMax: number;
  rxSensitivity: number;
}

export interface LossConstants {
  spliceLoss: number;
  connectorLoss: number;
  fiberTypes: FiberType[];
  splitters: Splitter[];
}

export interface Topology {
  txPower: number;
  rxSensitivity: number;
  opticalClassId: string | null;
  wavelength: Wavelength;
  fiberTypeId: string;
  segments: Segment[];
}

export interface SegmentResult {
  segmentId: string;
  name: string;
  cableLoss: number;
  spliceLoss: number;
  connectorLoss: number;
  splitterLoss: number | null;
  totalLoss: number;
  /** Total loss accumulated from OLT along this segment's parent chain. */
  cumulativeLoss: number;
  /** Optical power at the end of this segment on its main branch, in dBm. */
  powerAtEnd: number;
  splitter: Splitter | null;
}

export interface TapResult {
  /** Name of the segment whose FBT splitter produces this tapped output. */
  segmentName: string;
  splitterLabel: string;
  power: number;
}

export interface PathResult {
  /** Name of the endpoint segment that terminates this path. */
  label: string;
  /** Segment results ordered from the OLT side to the endpoint. */
  segments: SegmentResult[];
  totalLoss: number;
  powerReceived: number;
  /** True when this path has the lowest power of all paths. */
  isWeakest: boolean;
}

export type Verdict = 'ok' | 'marginal' | 'fail';

export interface CalcResult {
  txPower: number;
  rxSensitivity: number;
  wavelength: Wavelength;
  fiberType: FiberType;
  /** One path per endpoint segment (a segment no other segment branches from). */
  paths: PathResult[];
  /** Tapped (low-power) outputs of FBT ratio splitters along the topology. */
  taps: TapResult[];
  /** All segments in input order, for flat listings. */
  segments: SegmentResult[];
  totalLoss: number;
  powerReceived: number;
  margin: number;
  verdict: Verdict;
}
