import { describe, expect, it } from 'vitest';
import { compareVersions, interpretRelease, parseVersion } from './updates';

describe('parseVersion', () => {
  it('accepts plain, prefixed and prerelease versions', () => {
    expect(parseVersion('0.1.0')).toEqual({ core: [0, 1, 0], prerelease: [] });
    expect(parseVersion('v1.2.3')).toEqual({ core: [1, 2, 3], prerelease: [] });
    expect(parseVersion(' 1.0.0-alpha.2 ')).toEqual({ core: [1, 0, 0], prerelease: ['alpha', '2'] });
    expect(parseVersion('1.0.0+build.5')).toEqual({ core: [1, 0, 0], prerelease: [] });
  });

  it('rejects nonsense', () => {
    for (const value of ['', '   ', 'latest', 'v', '1.x.0', '1..0', null, 42, {}]) {
      expect(parseVersion(value), String(value)).toBeNull();
    }
  });
});

describe('compareVersions', () => {
  it('orders numeric cores', () => {
    expect(compareVersions('0.1.0', '0.2.0')).toBe(-1);
    expect(compareVersions('1.0.0', '0.9.9')).toBe(1);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
  });

  it('sorts a prerelease below its final release', () => {
    expect(compareVersions('0.1.0-alpha.1', '0.1.0')).toBe(-1);
    expect(compareVersions('0.1.0', '0.1.0-alpha.1')).toBe(1);
    expect(compareVersions('0.1.0-alpha.1', '0.1.0-alpha.2')).toBe(-1);
    expect(compareVersions('0.1.0-alpha.9', '0.1.0-alpha.10')).toBe(-1);
    expect(compareVersions('0.1.0-beta', '0.1.0-alpha')).toBe(1);
  });

  it('returns null when either side is unreadable', () => {
    expect(compareVersions('nope', '1.0.0')).toBeNull();
    expect(compareVersions('1.0.0', undefined)).toBeNull();
  });
});

describe('interpretRelease', () => {
  const release = { tag_name: 'v0.2.0', html_url: 'https://github.com/flashrod/orb/releases/tag/v0.2.0', body: 'Notes' };

  it('reports a newer release', () => {
    expect(interpretRelease(release, '0.1.0')).toMatchObject({
      status: 'update-available',
      latestVersion: '0.2.0',
      currentVersion: '0.1.0',
      url: release.html_url,
      notes: 'Notes',
    });
  });

  it('reports being current, including for a newer local build', () => {
    expect(interpretRelease({ ...release, tag_name: 'v0.1.0' }, '0.1.0').status).toBe('up-to-date');
    expect(interpretRelease({ ...release, tag_name: 'v0.1.0' }, '0.1.1').status).toBe('up-to-date');
  });

  it('does not treat a prerelease as newer than the final release', () => {
    expect(interpretRelease({ ...release, tag_name: 'v0.2.0-alpha.1' }, '0.2.0').status).toBe('up-to-date');
    expect(interpretRelease({ ...release, tag_name: 'v0.2.0-alpha.2' }, '0.2.0-alpha.1').status).toBe('update-available');
  });

  it('errors instead of guessing', () => {
    expect(interpretRelease(null, '0.1.0').status).toBe('error');
    expect(interpretRelease({}, '0.1.0').status).toBe('error');
    expect(interpretRelease({ tag_name: 'nightly' }, '0.1.0').status).toBe('error');
    expect(interpretRelease(release, 'not-a-version').status).toBe('error');
    expect(interpretRelease({ ...release, draft: true }, '0.1.0').status).toBe('error');
  });

  it('ignores an insecure or missing release URL', () => {
    expect(interpretRelease({ ...release, html_url: 'javascript:alert(1)' }, '0.1.0').url).toBeNull();
    expect(interpretRelease({ tag_name: 'v0.2.0' }, '0.1.0').url).toBeNull();
  });
});
