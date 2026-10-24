import { describe, expect, it } from 'vitest';
import { findOpenUrl } from './cli';

describe('findOpenUrl', () => {
  it('finds an http URL among launcher arguments', () => {
    expect(findOpenUrl(['/path/electron', 'dist/main.js', '--user-data-dir=/tmp/p', 'https://example.com/a']))
      .toBe('https://example.com/a');
  });

  it('strips tracking parameters from the launch URL', () => {
    expect(findOpenUrl(['electron', 'https://example.com/?utm_source=mail&id=2']))
      .toBe('https://example.com/?id=2');
  });

  it('ignores flags and non-web arguments', () => {
    expect(findOpenUrl(['electron', '--remote-debugging-port=9222', 'dist/main.js', 'file:///tmp/a.html']))
      .toBeNull();
  });

  it('returns the first web URL when several are present', () => {
    expect(findOpenUrl(['electron', 'https://a.test/', 'https://b.test/'])).toBe('https://a.test/');
  });

  it('normalizes a bare web URL', () => {
    expect(findOpenUrl(['electron', 'HTTPS://Example.COM/Path'])).toBe('https://example.com/Path');
  });
});
