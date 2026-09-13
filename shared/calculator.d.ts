import type {
  CalcResult,
  FiberType,
  LossConstants,
  OpticalClass,
  Splitter,
  Topology,
  Verdict,
} from './types';

export declare function getFiberType(constants: LossConstants, id: string): FiberType;
export declare function getSplitter(constants: LossConstants, id: string | null): Splitter | null;
export declare function getOpticalClass(id: string | null): OpticalClass;
export declare function clampNumber(value: number, max: number): number;
export declare function verdictOf(margin: number): Verdict;
export declare function biggestContributor(result: CalcResult): 'cable' | 'splice' | 'connector' | 'splitter';
export declare function calculate(topology: Topology, constants?: LossConstants): CalcResult;
