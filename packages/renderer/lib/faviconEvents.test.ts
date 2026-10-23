import { describe, expect, it } from 'vitest';

/**
 * Extracts favicon URLs from the page-favicon-updated event.
 * Electron webview sends (event, faviconUrls: string[]).
 */
function extractFaviconUrls(event: any, faviconUrls?: any[]): string[] {
  if (Array.isArray(faviconUrls)) return faviconUrls.filter((u): u is string => typeof u === 'string');
  return [];
}

/**
 * Picks the best favicon URL (first valid one).
 */
function pickBestFavicon(urls: string[]): string {
  return urls[0] || '';
}

describe('webview favicon (page-favicon-updated event)', () => {
  it('extracts favicon URLs from the event', () => {
    const urls = ['https://example.com/favicon.ico', 'https://example.com/icon.png'];
    expect(extractFaviconUrls(null, urls)).toEqual(urls);
  });

  it('returns empty array when no faviconUrls provided', () => {
    expect(extractFaviconUrls(null, undefined)).toEqual([]);
  });

  it('filters out non-string entries', () => {
    expect(extractFaviconUrls(null, ['valid.ico', 123, null, true, 'also.valid'])).toEqual(['valid.ico', 'also.valid']);
  });

  it('picks the first favicon URL', () => {
    expect(pickBestFavicon(['a.ico', 'b.ico'])).toBe('a.ico');
    expect(pickBestFavicon([])).toBe('');
  });
});
