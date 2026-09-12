import type { FiberType, LossConstants, OpticalClass, Splitter, Wavelength } from './types';

export const DEFAULT_SPLICE_LOSS = 0.1;
export const DEFAULT_CONNECTOR_LOSS = 0.3;

export const WAVELENGTHS: Wavelength[] = [1310, 1490, 1550];

export const DEFAULT_FIBER_TYPES: FiberType[] = [
  {
    id: 'g652d',
    label: 'G.652.D (Standard)',
    attenuation: { 1310: 0.35, 1490: 0.28, 1550: 0.22 },
  },
  {
    id: 'g657a',
    label: 'G.657.A (Bend-insensitive)',
    attenuation: { 1310: 0.35, 1490: 0.28, 1550: 0.22 },
  },
  {
    id: 'g655',
    label: 'G.655 (NZ-DSF)',
    attenuation: { 1310: 0.4, 1490: 0.3, 1550: 0.24 },
  },
];

export const DEFAULT_SPLITTERS: Splitter[] = [
  { id: 'none', kind: 'uniform', label: 'direct', loss: 0 },
  { id: 'plc-1x2', kind: 'uniform', label: '1:2 PLC', loss: 3.7 },
  { id: 'plc-1x4', kind: 'uniform', label: '1:4 PLC', loss: 7.2 },
  { id: 'plc-1x8', kind: 'uniform', label: '1:8 PLC', loss: 10.5 },
  { id: 'plc-1x16', kind: 'uniform', label: '1:16 PLC', loss: 13.5 },
  { id: 'plc-1x32', kind: 'uniform', label: '1:32 PLC', loss: 17.0 },
  { id: 'plc-1x64', kind: 'uniform', label: '1:64 PLC', loss: 20.5 },
  { id: 'fbt-50-50', kind: 'ratio', label: '50:50 FBT', loss1: 3.4, loss2: 3.4, ratio: 50 },
  { id: 'fbt-60-40', kind: 'ratio', label: '60:40 FBT', loss1: 2.6, loss2: 4.4, ratio: 60 },
  { id: 'fbt-70-30', kind: 'ratio', label: '70:30 FBT', loss1: 1.9, loss2: 5.5, ratio: 70 },
  { id: 'fbt-80-20', kind: 'ratio', label: '80:20 FBT', loss1: 1.3, loss2: 7.3, ratio: 80 },
  { id: 'fbt-85-15', kind: 'ratio', label: '85:15 FBT', loss1: 1.0, loss2: 9.5, ratio: 85 },
  { id: 'fbt-90-10', kind: 'ratio', label: '90:10 FBT', loss1: 0.7, loss2: 10.8, ratio: 90 },
  { id: 'fbt-95-5', kind: 'ratio', label: '95:5 FBT', loss1: 0.5, loss2: 14.5, ratio: 95 },
  { id: 'fbt-99-1', kind: 'ratio', label: '99:1 FBT', loss1: 0.3, loss2: 21.0, ratio: 99 },
];

export const OPTICAL_CLASSES: OpticalClass[] = [
  { id: 'custom', label: 'custom', txPower: 0, txMax: 0, rxSensitivity: -27 },
  { id: 'gpon-b', label: 'GPON Class B+', txPower: 3, txMax: 5, rxSensitivity: -28 },
  { id: 'gpon-c', label: 'GPON Class C+', txPower: 5, txMax: 7, rxSensitivity: -32 },
  { id: 'xgs-n1', label: 'XGS-PON N1', txPower: 4, txMax: 6, rxSensitivity: -28 },
  { id: 'xgs-n2', label: 'XGS-PON N2', txPower: 5, txMax: 7, rxSensitivity: -30 },
];

export const DEFAULT_CONSTANTS: LossConstants = {
  spliceLoss: DEFAULT_SPLICE_LOSS,
  connectorLoss: DEFAULT_CONNECTOR_LOSS,
  fiberTypes: DEFAULT_FIBER_TYPES,
  splitters: DEFAULT_SPLITTERS,
};

export const MARGIN_OK_THRESHOLD = 3;
