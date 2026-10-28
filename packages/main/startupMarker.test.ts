import { describe, expect, it, vi } from 'vitest';
import { startupMarkerPath, writeStartupMarker } from './startupMarker';

describe('startupMarkerPath', () => {
  it('is inert without the environment variable', () => {
    expect(startupMarkerPath({})).toBeNull();
    expect(startupMarkerPath({ ORB_STARTUP_MARKER: '' })).toBeNull();
    expect(startupMarkerPath({ ORB_STARTUP_MARKER: '   ' })).toBeNull();
  });

  it('returns the configured path, trimmed', () => {
    expect(startupMarkerPath({ ORB_STARTUP_MARKER: '/tmp/marker' })).toBe('/tmp/marker');
    expect(startupMarkerPath({ ORB_STARTUP_MARKER: '  /tmp/marker  ' })).toBe('/tmp/marker');
  });
});

describe('writeStartupMarker', () => {
  it('writes rounded milliseconds', () => {
    const write = vi.fn();
    expect(writeStartupMarker('/tmp/marker', 1234.7, write)).toBe(true);
    expect(write).toHaveBeenCalledWith('/tmp/marker', '1235');
  });

  it('does nothing without a path', () => {
    const write = vi.fn();
    expect(writeStartupMarker(null, 100, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects nonsense durations', () => {
    const write = vi.fn();
    expect(writeStartupMarker('/tmp/marker', -1, write)).toBe(false);
    expect(writeStartupMarker('/tmp/marker', Number.NaN, write)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it('reports a write failure instead of throwing', () => {
    const write = vi.fn(() => { throw new Error('read-only'); });
    expect(writeStartupMarker('/tmp/marker', 10, write)).toBe(false);
  });
});
