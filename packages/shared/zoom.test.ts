import { describe, expect, it } from 'vitest';
import { clampZoom, MAX_ZOOM, MIN_ZOOM, nextZoomFactor } from './zoom';

describe('nextZoomFactor', () => {
  it('steps up through the list', () => {
    expect(nextZoomFactor(1, 'in')).toBeCloseTo(1.1);
    expect(nextZoomFactor(1.1, 'in')).toBeCloseTo(1.25);
  });

  it('steps down through the list', () => {
    expect(nextZoomFactor(1, 'out')).toBeCloseTo(0.9);
    expect(nextZoomFactor(0.9, 'out')).toBeCloseTo(0.8);
  });

  it('clamps at the maximum', () => {
    expect(nextZoomFactor(MAX_ZOOM, 'in')).toBe(MAX_ZOOM);
  });

  it('clamps at the minimum', () => {
    expect(nextZoomFactor(MIN_ZOOM, 'out')).toBe(MIN_ZOOM);
  });

  it('resets to 100%', () => {
    expect(nextZoomFactor(2.5, 'reset')).toBe(1);
    expect(nextZoomFactor(0.33, 'reset')).toBe(1);
  });

  it('tolerates a factor between steps', () => {
    expect(nextZoomFactor(1.05, 'in')).toBeCloseTo(1.1);
    expect(nextZoomFactor(1.05, 'out')).toBeCloseTo(1);
  });
});

describe('clampZoom', () => {
  it('keeps factors inside the supported range', () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(10)).toBe(MAX_ZOOM);
    expect(clampZoom(1.25)).toBe(1.25);
  });

  it('falls back to 100% for non-finite input', () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
