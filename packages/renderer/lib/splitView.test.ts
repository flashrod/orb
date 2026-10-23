import { describe, expect, it } from 'vitest';
import { chooseSplitPair, normalizeSplitRatio } from './splitView';

describe('split view selection', () => {
  it('pairs the active tab with a different selected tab', () => {
    expect(chooseSplitPair('active', 'selected', ['active', 'selected', 'other'])).toEqual(['active', 'selected']);
  });

  it('chooses another open tab if the selected tab is already active', () => {
    expect(chooseSplitPair('active', 'active', ['active', 'other', 'last'])).toEqual(['active', 'other']);
  });

  it('declines a split when fewer than two distinct tabs are available', () => {
    expect(chooseSplitPair('only', 'only', ['only'])).toBeNull();
  });

  it('clamps divider ratios to a usable range', () => {
    expect(normalizeSplitRatio(0)).toBe(0.25);
    expect(normalizeSplitRatio(0.62)).toBe(0.62);
    expect(normalizeSplitRatio(1)).toBe(0.75);
  });
});
