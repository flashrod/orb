import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relativeTime';

const now = new Date('2026-10-27T12:00:00Z').getTime();
const ago = (ms: number) => formatRelativeTime(now - ms, now);

describe('formatRelativeTime', () => {
  it('calls the last minute "Just now"', () => {
    expect(ago(0)).toBe('Just now');
    expect(ago(59_000)).toBe('Just now');
  });

  it('counts minutes and hours', () => {
    expect(ago(5 * 60_000)).toBe('5m ago');
    expect(ago(59 * 60_000)).toBe('59m ago');
    expect(ago(3 * 3_600_000)).toBe('3h ago');
    expect(ago(23 * 3_600_000)).toBe('23h ago');
  });

  it('says yesterday, then counts days', () => {
    expect(ago(25 * 3_600_000)).toBe('Yesterday');
    expect(ago(3 * 86_400_000)).toBe('3d ago');
  });

  it('falls back to a date after a week', () => {
    expect(ago(30 * 86_400_000)).toMatch(/\d/);
    expect(ago(30 * 86_400_000)).not.toMatch(/ago/);
  });

  it('treats future timestamps as now', () => {
    expect(formatRelativeTime(now + 60_000, now)).toBe('Just now');
  });
});
