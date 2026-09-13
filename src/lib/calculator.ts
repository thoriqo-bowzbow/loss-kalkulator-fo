/**
 * Mesin hitung link budget — re-export dari shared (sumber tunggal web & CLI).
 * Web dan CLI wajib memakai engine ini; jangan menduplikasi logika.
 */
export {
  calculate,
  verdictOf,
  biggestContributor,
  getFiberType,
  getSplitter,
  getOpticalClass,
  clampNumber,
} from '../../shared/calculator.js';
