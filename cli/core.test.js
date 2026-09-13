import { describe, expect, it } from 'vitest';
import { calculate, clampNumber, getOpticalClass, verdictOf } from './core.js';

const REFERENCE = {
  tx: 7,
  rx: -27,
  wavelength: 1310,
  fiberTypeId: 'g652d',
  segments: [{ name: 'FEEDER', km: 10, splice: 5, conn: 4, splitterId: 'plc-1x8' }],
};

describe('calculate — kasus referensi (paritas dengan web)', () => {
  it('7 dBm, 10 km, 5 splice, 4 konektor, 1:8 → -8.70 dBm LAYAK', () => {
    const r = calculate(REFERENCE);
    // kabel 3.5 + splice 0.5 + konektor 1.2 + splitter 10.5 = 15.7
    expect(r.totalLoss).toBeCloseTo(15.7, 5);
    expect(r.powerReceived).toBeCloseTo(-8.7, 5);
    expect(r.margin).toBeCloseTo(18.3, 5);
    expect(r.verdict).toBe('ok');
  });

  it('gelombang 1550 nm memakai atenuasi 0.22 dB/km', () => {
    const r = calculate({ ...REFERENCE, wavelength: 1550 });
    expect(r.totalLoss).toBeCloseTo(10 * 0.22 + 0.5 + 1.2 + 10.5, 5);
  });

  it('tipe fiber G.657.A memakai atenuasi katalog di 1310 nm', () => {
    const r = calculate({ ...REFERENCE, fiberTypeId: 'g657a' });
    expect(r.segments[0].cableLoss).toBeCloseTo(10 * 0.35, 5);
  });
});

describe('calculate — FBT dual-path', () => {
  it('60:40 FBT menghasilkan power jalur utama & tap', () => {
    const r = calculate({
      tx: 5,
      rx: -27,
      wavelength: 1310,
      fiberTypeId: 'g652d',
      segments: [{ name: 'FEEDER', km: 2, splice: 1, conn: 2, splitterId: 'fbt-60-40' }],
    });
    // fisik: 0.7+0.1+0.6 = 1.4 ; utama -2.6 → 1.0 ; tap -4.4 → -0.8
    expect(r.segments[0].powerAtEnd).toBeCloseTo(1.0, 5);
    expect(r.taps).toHaveLength(1);
    expect(r.taps[0].power).toBeCloseTo(-0.8, 5);
    // verdict mengambil yang terlemah (tap)
    expect(r.powerReceived).toBeCloseTo(-0.8, 5);
    expect(r.margin).toBeCloseTo(26.2, 5);
  });

  it('PLC tidak menghasilkan tap', () => {
    const r = calculate(REFERENCE);
    expect(r.taps).toHaveLength(0);
  });
});

describe('calculate — verdict & rekomendasi', () => {
  it('link GAGAL → rekomendasi menyebut kontributor terbesar (splitter)', () => {
    const r = calculate({ ...REFERENCE, rx: -5 });
    expect(r.verdict).toBe('fail');
    expect(r.recommendation).toMatch(/splitter/i);
  });

  it('margin tipis → MARGINAL', () => {
    expect(verdictOf(2.9)).toBe('marginal');
    expect(verdictOf(0.1)).toBe('marginal');
    expect(verdictOf(0)).toBe('fail');
    expect(verdictOf(3)).toBe('ok');
  });

  it('kabel dominan pada link gagal panjang tanpa splitter', () => {
    const r = calculate({
      tx: 7,
      rx: -27,
      wavelength: 1310,
      fiberTypeId: 'g652d',
      segments: [{ name: 'LONG', km: 100, splice: 2, conn: 1, splitterId: null }],
    });
    expect(r.verdict).toBe('fail');
    expect(r.recommendation).toMatch(/kabel/i);
  });
});

describe('validasi input', () => {
  it('nilai negatif dan NaN di-clamp ke 0', () => {
    const r = calculate({
      tx: 7,
      rx: -27,
      wavelength: 1310,
      fiberTypeId: 'g652d',
      segments: [{ name: 'X', km: -5, splice: NaN, conn: 2, splitterId: null }],
    });
    expect(r.segments[0].cableLoss).toBe(0);
    expect(r.segments[0].spliceLoss).toBe(0);
    expect(r.segments[0].connectorLoss).toBeCloseTo(0.6, 5);
  });

  it('topologi kosong → power = TX, tidak crash', () => {
    const r = calculate({ tx: 7, rx: -27, wavelength: 1310, fiberTypeId: 'g652d', segments: [] });
    expect(r.powerReceived).toBe(7);
    expect(r.verdict).toBe('ok');
  });
});

describe('helper', () => {
  it('getOpticalClass mengembalikan preset TX/RX (katalog shared)', () => {
    expect(getOpticalClass('gpon-c').txPower).toBe(5);
    expect(getOpticalClass('gpon-c').rxSensitivity).toBe(-32);
    expect(getOpticalClass('tidak-ada').label).toBe('custom');
  });
});
