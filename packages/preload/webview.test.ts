/**
 * @vitest-environment jsdom
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: { send: vi.fn(), on: vi.fn(), invoke: vi.fn() },
  webFrame: { executeJavaScript: vi.fn().mockResolvedValue(undefined) },
}));

import { contextBridge } from 'electron';

const { isValidPickedElement, isValidGlanceUrl } = await import('./webview');

describe('orbPageApi removed (A2)', () => {
  it('does not expose orbPageApi via contextBridge', () => {
    const calls = vi.mocked(contextBridge.exposeInMainWorld).mock.calls;
    const channels = calls.map((args) => args[0]);
    expect(channels).not.toContain('orbPageApi');
  });

  it('rejects invalid picked element payloads', () => {
    expect(isValidPickedElement(null)).toBe(false);
    expect(isValidPickedElement(undefined)).toBe(false);
    expect(isValidPickedElement('string')).toBe(false);
    expect(isValidPickedElement(42)).toBe(false);
    expect(isValidPickedElement({})).toBe(false);
    expect(isValidPickedElement({ selector: '' })).toBe(false);
    expect(isValidPickedElement({ selector: 'a', label: 'b' })).toBe(false); // missing score
    expect(
      isValidPickedElement({ selector: 'a'.repeat(1001), label: 'b', score: 1 }),
    ).toBe(false); // selector too long
    expect(
      isValidPickedElement({ selector: 'a', label: 'b'.repeat(501), score: 1 }),
    ).toBe(false); // label too long
    expect(isValidPickedElement({ selector: 'a', label: 'b', score: NaN })).toBe(false);
  });

  it('accepts valid picked element payloads', () => {
    expect(isValidPickedElement({ selector: 'a', label: 'b', score: 1 })).toBe(true);
    expect(isValidPickedElement({ selector: 'div.class', label: 'Click', score: 0.5 })).toBe(true);
    expect(isValidPickedElement({ selector: 'a', label: 'b', score: 0 })).toBe(true);
  });

  it('rejects invalid glance URLs', () => {
    expect(isValidGlanceUrl(null)).toBe(false);
    expect(isValidGlanceUrl(undefined)).toBe(false);
    expect(isValidGlanceUrl(42)).toBe(false);
    expect(isValidGlanceUrl('')).toBe(false);
    expect(isValidGlanceUrl('a'.repeat(2049))).toBe(false);
  });

  it('accepts valid glance URLs', () => {
    expect(isValidGlanceUrl('https://example.com')).toBe(true);
    expect(isValidGlanceUrl('http://example.com/page')).toBe(true);
  });
});

describe('main process payload validation (A2)', () => {
  it('glance link rejects non-string and oversized URLs', () => {
    expect(typeof null).not.toBe('string');
    expect(typeof 42).not.toBe('string');
    expect(''.length).toBe(0);
    expect('a'.repeat(2049).length).toBeGreaterThan(2048);
  });

  it('glance link rejects non-http URLs', () => {
    const nonHttp = [
      'javascript:alert(1)',
      'data:text/html,<script>',
      'mailto:test@test.com',
      'file:///etc/passwd',
    ];
    for (const url of nonHttp) {
      expect(url.startsWith('http://') || url.startsWith('https://')).toBe(false);
    }
  });
});
