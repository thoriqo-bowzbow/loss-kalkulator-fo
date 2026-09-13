import type { FiberType, LossConstants, OpticalClass, Splitter, Verdict, Wavelength } from './types';

export const WAVELENGTHS: Wavelength[];
export const DEFAULT_SPLITTERS: Splitter[];
export const FIBER_TYPES: FiberType[];
export const OPTICAL_CLASSES: OpticalClass[];
export const DEFAULT_CONSTANTS: LossConstants;
export const MARGIN_OK_THRESHOLD: number;

export function getFiberType(constants: LossConstants, id: string): FiberType;
export function getSplitter(constants: LossConstants, id: string | null): Splitter | null;
export function getOpticalClass(id: string | null): OpticalClass;
export function clampNumber(value: number, max: number): number;
export function verdictOf(margin: number): Verdict;
