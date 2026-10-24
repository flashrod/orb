import { describe, expect, it } from 'vitest';
import { formatBytes, sortByMemory, totalTabBytes } from './memory';

describe('totalTabBytes', () => {
  it('sums finite positive samples', () => {
    expect(totalTabBytes([
      { id: 'a', pid: 1, bytes: 100 },
      { id: 'b', pid: 2, bytes: 250 },
    ])).toBe(350);
  });

  it('ignores missing and invalid values', () => {
    expect(totalTabBytes([
      { id: 'a', pid: null, bytes: 0 },
      { id: 'b', pid: 2, bytes: Number.NaN },
      { id: 'c', pid: 3, bytes: -5 },
    ])).toBe(0);
  });
});

describe('sortByMemory', () => {
  it('puts the largest consumers first and breaks ties by id', () => {
    expect(sortByMemory([
      { id: 'small', pid: 1, bytes: 10 },
      { id: 'large', pid: 2, bytes: 90 },
      { id: 'same-a', pid: 3, bytes: 40 },
      { id: 'same-b', pid: 4, bytes: 40 },
    ]).map((sample) => sample.id)).toEqual(['large', 'same-a', 'same-b', 'small']);
  });
});

describe('formatBytes', () => {
  it('formats megabytes and gigabytes', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(512 * 1024)).toBe('<1 MB');
    expect(formatBytes(84 * 1024 * 1024)).toBe('84 MB');
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
  });
});
