/**
 * Deklarasi tipe bersama untuk mesin hitung (dipakai web TypeScript & CLI JavaScript).
 * Ini sumber kebenaran tunggal — web dan CLI tidak boleh punya mesin hitung masing-masing.
 */

export type Wavelength = 1310 | 1490 | 1550;

export interface FiberType {
  id: string;
  label: string;
  attenuation: Record<Wavelength, number>;
}

export type SplitterKind = 'uniform' | 'ratio';

export interface Splitter {
  id: string;
  label: string;
  kind: SplitterKind;
  /** Loss untuk splitter uniform. */
  loss?: number;
  /** Loss cabang utama untuk splitter ratio (FBT). */
  loss1?: number;
  /** Loss cabang tap untuk splitter ratio (FBT). */
  loss2?: number;
  ratio?: number;
}

export interface Segment {
  id: string;
  name: string;
  distanceKm: number;
  spliceCount: number;
  connectorCount: number;
  /** Splitter yang terpasang di ujung segmen ini, atau null. */
  splitterId: string | null;
  /**
   * Segmen induknya. null/undefined = lanjut dari OLT (segmen pertama) atau,
   * untuk kompatibilitas data lama, segmen sebelumnya dalam array.
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
  /** Total loss terakumulasi dari OLT sepanjang rantai parent segmen ini. */
  cumulativeLoss: number;
  /** Daya optik di ujung segmen ini pada cabang utamanya, dalam dBm. */
  powerAtEnd: number;
  splitter: Splitter | null;
}

export interface TapResult {
  segmentName: string;
  splitterLabel: string;
  power: number;
}

export interface PathResult {
  label: string;
  segments: SegmentResult[];
  totalLoss: number;
  powerReceived: number;
  isWeakest: boolean;
}

export type Verdict = 'ok' | 'marginal' | 'fail';

export interface CalcResult {
  txPower: number;
  rxSensitivity: number;
  wavelength: Wavelength;
  fiberType: FiberType;
  paths: PathResult[];
  taps: TapResult[];
  segments: SegmentResult[];
  totalLoss: number;
  powerReceived: number;
  margin: number;
  verdict: Verdict;
}
