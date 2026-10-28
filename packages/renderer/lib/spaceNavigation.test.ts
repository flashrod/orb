import { describe, expect, it } from 'vitest';
import { nextProfileId, nextSpaceIndex, wrapIndex } from './spaceNavigation';

describe('wrapIndex', () => {
  it('wraps forwards and backwards', () => {
    expect(wrapIndex(3, 3)).toBe(0);
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(4, 3)).toBe(1);
  });

  it('returns 0 for an empty collection', () => {
    expect(wrapIndex(2, 0)).toBe(0);
  });
});

describe('nextSpaceIndex', () => {
  it('moves forwards with wrap', () => {
    expect(nextSpaceIndex(0, 3, 1)).toBe(1);
    expect(nextSpaceIndex(2, 3, 1)).toBe(0);
  });

  it('moves backwards with wrap', () => {
    expect(nextSpaceIndex(0, 3, -1)).toBe(2);
    expect(nextSpaceIndex(1, 3, -1)).toBe(0);
  });

  it('starts at the first space when none is active', () => {
    expect(nextSpaceIndex(-1, 3, 1)).toBe(0);
    expect(nextSpaceIndex(-1, 3, -1)).toBe(2);
  });

  it('returns -1 when there are no spaces', () => {
    expect(nextSpaceIndex(0, 0, 1)).toBe(-1);
  });
});

describe('nextProfileId', () => {
  it('advances to the next profile and wraps', () => {
    expect(nextProfileId(['a', 'b', 'c'], 'a')).toBe('b');
    expect(nextProfileId(['a', 'b', 'c'], 'c')).toBe('a');
  });

  it('starts from the first profile when the current one is unknown', () => {
    expect(nextProfileId(['a', 'b'], 'missing')).toBe('a');
  });

  it('returns the only profile when there is nothing to cycle', () => {
    expect(nextProfileId(['a'], 'a')).toBe('a');
  });

  it('returns null when no profiles exist', () => {
    expect(nextProfileId([], 'a')).toBeNull();
  });
});
