import { describe, expect, it } from 'vitest';

/**
 * Extracts the page title from a page-title-updated event.
 * Electron sends (event, title: string).
 */
function extractTitle(event: any, title: any): string {
  return typeof title === 'string' ? title : '';
}

/**
 * Determines if a title is meaningful (not empty, not just whitespace).
 */
function isMeaningfulTitle(title: string): boolean {
  return title.trim().length > 0;
}

describe('webview title (page-title-updated event)', () => {
  it('extracts title from page-title-updated event', () => {
    expect(extractTitle(null, 'Example Page')).toBe('Example Page');
  });

  it('returns empty string for non-string title', () => {
    expect(extractTitle(null, null)).toBe('');
    expect(extractTitle(null, undefined)).toBe('');
    expect(extractTitle(null, 123)).toBe('');
  });

  it('rejects empty or whitespace-only titles', () => {
    expect(isMeaningfulTitle('')).toBe(false);
    expect(isMeaningfulTitle('   ')).toBe(false);
    expect(isMeaningfulTitle('Example')).toBe(true);
  });
});
