import { describe, expect, it } from 'vitest';
import { DEFAULT_STRING_LIMIT, EXTERNAL_URL_LIMIT, requireString, requireWebUrl } from './webUrl';

describe('requireString', () => {
  it('accepts normal strings', () => {
    expect(requireString('hello', 'value')).toBe('hello');
  });

  it('rejects blanks, non-strings and oversized values', () => {
    expect(() => requireString('', 'value')).toThrow('Invalid value.');
    expect(() => requireString(42, 'value')).toThrow('Invalid value.');
    expect(() => requireString('x'.repeat(DEFAULT_STRING_LIMIT + 1), 'value')).toThrow('Invalid value.');
  });

  it('honours a custom limit', () => {
    expect(requireString('abcd', 'value', 4)).toBe('abcd');
    expect(() => requireString('abcde', 'value', 4)).toThrow();
  });
});

describe('requireWebUrl', () => {
  it('accepts http and https', () => {
    expect(requireWebUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(requireWebUrl('http://example.com/')).toBe('http://example.com/');
  });

  it('refuses other schemes', () => {
    for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,hi', 'orb://settings', 'mailto:a@b.c']) {
      expect(() => requireWebUrl(url), url).toThrow('Only http and https URLs can be opened externally.');
    }
  });

  it('refuses nonsense', () => {
    expect(() => requireWebUrl('not a url')).toThrow('Invalid URL.');
    expect(() => requireWebUrl(undefined)).toThrow('Invalid URL.');
  });

  it('allows a long prefilled issue link that the old 2 KB cap rejected', () => {
    const body = 'x'.repeat(6000);
    const url = `https://github.com/flashrod/orb/issues/new?title=Crash&body=${body}`;
    expect(url.length).toBeGreaterThan(DEFAULT_STRING_LIMIT);
    expect(requireWebUrl(url)).toBe(url);
  });

  it('still caps runaway URLs', () => {
    expect(() => requireWebUrl(`https://example.com/${'x'.repeat(EXTERNAL_URL_LIMIT)}`)).toThrow('Invalid URL.');
  });
});
