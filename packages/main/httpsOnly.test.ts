import { describe, expect, it } from 'vitest';
import {
  httpsUpgradeTarget,
  isUpgradeableHost,
  normalizeExceptionDomain,
  shouldFallBackToHttp,
} from './httpsOnly';

describe('isUpgradeableHost', () => {
  it('accepts public hostnames', () => {
    expect(isUpgradeableHost('example.com')).toBe(true);
    expect(isUpgradeableHost('docs.google.com')).toBe(true);
    expect(isUpgradeableHost('8.8.8.8')).toBe(true);
  });

  it('leaves loopback and private networks alone', () => {
    for (const host of [
      'localhost',
      'app.localhost',
      '127.0.0.1',
      '10.1.2.3',
      '192.168.1.10',
      '172.16.0.1',
      '172.31.255.1',
      '169.254.1.1',
      '::1',
      '[::1]',
      '0.0.0.0',
      'printer.local',
    ]) {
      expect(isUpgradeableHost(host), host).toBe(false);
    }
  });

  it('does not treat 172.32 as private', () => {
    expect(isUpgradeableHost('172.32.0.1')).toBe(true);
  });
});

describe('httpsUpgradeTarget', () => {
  it('upgrades a plain top-level navigation', () => {
    expect(httpsUpgradeTarget('http://example.com/page', 'mainFrame')).toBe('https://example.com/page');
  });

  it('keeps path, query, and fragment', () => {
    expect(httpsUpgradeTarget('http://example.com/a/b?c=1#d', 'mainFrame')).toBe('https://example.com/a/b?c=1#d');
  });

  it('leaves subresources alone', () => {
    for (const type of ['subFrame', 'image', 'script', 'stylesheet', 'xhr', 'font']) {
      expect(httpsUpgradeTarget('http://cdn.example.com/a.png', type), type).toBeNull();
    }
  });

  it('leaves HTTPS and non-web URLs alone', () => {
    expect(httpsUpgradeTarget('https://example.com', 'mainFrame')).toBeNull();
    expect(httpsUpgradeTarget('about:blank', 'mainFrame')).toBeNull();
    expect(httpsUpgradeTarget('file:///tmp/a.html', 'mainFrame')).toBeNull();
    expect(httpsUpgradeTarget('not a url', 'mainFrame')).toBeNull();
  });

  it('honours per-site exceptions, including subdomains', () => {
    const isException = (host: string) => host === 'example.com' || host.endsWith('.example.com');
    expect(httpsUpgradeTarget('http://example.com', 'mainFrame', isException)).toBeNull();
    expect(httpsUpgradeTarget('http://www.example.com', 'mainFrame', isException)).toBeNull();
    expect(httpsUpgradeTarget('http://other.com', 'mainFrame', isException)).toBe('https://other.com/');
  });

  it('skips loopback and explicit non-default ports', () => {
    expect(httpsUpgradeTarget('http://localhost:3000', 'mainFrame')).toBeNull();
    expect(httpsUpgradeTarget('http://127.0.0.1', 'mainFrame')).toBeNull();
    expect(httpsUpgradeTarget('http://example.com:8080/', 'mainFrame')).toBeNull();
  });

  it('normalises an explicit :80 port away', () => {
    expect(httpsUpgradeTarget('http://example.com:80/x', 'mainFrame')).toBe('https://example.com/x');
  });
});

describe('shouldFallBackToHttp', () => {
  it('falls back on connection-level failures', () => {
    for (const code of [-102, -104, -105, -107, -118, -324, -21]) {
      expect(shouldFallBackToHttp(code), String(code)).toBe(true);
    }
  });

  it('never falls back on certificate errors', () => {
    for (const code of [-200, -201, -202, -207, -213]) {
      expect(shouldFallBackToHttp(code), String(code)).toBe(false);
    }
  });

  it('ignores aborts, blocks and unknown codes', () => {
    expect(shouldFallBackToHttp(-3)).toBe(false); // ERR_ABORTED
    expect(shouldFallBackToHttp(-20)).toBe(false); // ERR_BLOCKED_BY_CLIENT
    expect(shouldFallBackToHttp(0)).toBe(false);
  });
});

describe('normalizeExceptionDomain', () => {
  it('accepts hosts, URLs and uppercase input', () => {
    expect(normalizeExceptionDomain('example.com')).toBe('example.com');
    expect(normalizeExceptionDomain('https://Example.COM/path?q=1')).toBe('example.com');
    expect(normalizeExceptionDomain('  http://sub.example.com:8080/ ')).toBe('sub.example.com');
  });

  it('rejects empty and malformed input', () => {
    expect(normalizeExceptionDomain('')).toBe('');
    expect(normalizeExceptionDomain('   ')).toBe('');
    expect(normalizeExceptionDomain('http://')).toBe('');
  });
});
