import { describe, expect, it } from 'vitest';

/**
 * Decides how to handle a popup window request.
 * Returns { action: 'deny' } to block the popup window and notify the renderer
 * to open the URL in a new tab instead.
 */
function handlePopupRequest(url: string): { action: 'deny'; reason: string } | { action: 'allow' } {
  // Block empty or invalid URLs
  if (!url || url === 'about:blank') {
    return { action: 'deny', reason: 'invalid-url' };
  }

  try {
    const parsed = new URL(url);

    // Block non-http(s) schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { action: 'deny', reason: 'unsupported-protocol' };
    }

    // Deny the popup window; renderer will open in a new tab
    return { action: 'deny', reason: 'open-in-new-tab' };
  } catch {
    return { action: 'deny', reason: 'parse-error' };
  }
}

describe('popup window handling (setWindowOpenHandler)', () => {
  it('denies popup windows and opens in new tab instead', () => {
    const result = handlePopupRequest('https://example.com/page');
    expect(result.action).toBe('deny');
    if (result.action === 'deny') expect(result.reason).toBe('open-in-new-tab');
  });

  it('denies invalid URLs', () => {
    const result = handlePopupRequest('about:blank');
    expect(result.action).toBe('deny');
    if (result.action === 'deny') expect(result.reason).toBe('invalid-url');
  });

  it('denies empty URLs', () => {
    const result = handlePopupRequest('');
    expect(result.action).toBe('deny');
    if (result.action === 'deny') expect(result.reason).toBe('invalid-url');
  });

  it('denies non-http(s) schemes', () => {
    const result = handlePopupRequest('ftp://files.example.com');
    expect(result.action).toBe('deny');
    if (result.action === 'deny') expect(result.reason).toBe('unsupported-protocol');
  });

  it('handles malformed URLs gracefully', () => {
    const result = handlePopupRequest('not-a-url!!');
    expect(result.action).toBe('deny');
    if (result.action === 'deny') expect(result.reason).toBe('parse-error');
  });
});
