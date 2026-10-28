import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// adBlocker.ts imports Electron for `app.getPath`. Point that at a throwaway
// directory so persistence can be asserted without touching real user data.
let userDataDir = '';

vi.mock('electron', () => ({
  app: { getPath: () => userDataDir },
  session: { fromPartition: () => ({ webRequest: {} }) },
  dialog: { showMessageBox: async () => ({ response: 0 }) },
}));

const { AdBlocker } = await import('./adBlocker');

function readPrefs(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(userDataDir, 'privacy-preferences.json'), 'utf8'));
}

let blocker: InstanceType<typeof AdBlocker>;

beforeAll(() => {
  userDataDir = mkdtempSync(path.join(tmpdir(), 'orb-https-only-'));
});

afterAll(() => {
  rmSync(userDataDir, { recursive: true, force: true });
});

beforeEach(() => {
  blocker = new AdBlocker();
});

describe('HTTPS-only defaults', () => {
  it('is enabled for a fresh profile', () => {
    expect(blocker.isHttpsOnly()).toBe(true);
  });

  it('upgrades top-level HTTP navigations only', () => {
    expect(blocker.upgradeToHttps('http://example.com/a?b=1', 'mainFrame')).toBe('https://example.com/a?b=1');
    expect(blocker.upgradeToHttps('http://example.com/a.png', 'image')).toBeNull();
    expect(blocker.upgradeToHttps('http://example.com/a.js', 'script')).toBeNull();
    expect(blocker.upgradeToHttps('https://example.com', 'mainFrame')).toBeNull();
    expect(blocker.upgradeToHttps('http://localhost:3000', 'mainFrame')).toBeNull();
  });

  it('does nothing when the user turns HTTPS-only off', () => {
    blocker.setHttpsOnly(false);
    expect(blocker.upgradeToHttps('http://example.com', 'mainFrame')).toBeNull();
  });

  it('skips hosts on the exception list, including subdomains', () => {
    blocker.addHttpsException('example.com');
    expect(blocker.upgradeToHttps('http://example.com', 'mainFrame')).toBeNull();
    expect(blocker.upgradeToHttps('http://shop.example.com', 'mainFrame')).toBeNull();
    expect(blocker.upgradeToHttps('http://other.com', 'mainFrame')).toBe('https://other.com/');
  });
});

describe('HTTPS-only fallback', () => {
  it('retries the original HTTP URL after a connection failure', () => {
    blocker.upgradeToHttps('http://legacy.example/x', 'mainFrame');

    const fallback = blocker.fallbackForFailedUpgrade('https://legacy.example/x', -102);
    expect(fallback).toEqual({ from: 'http://legacy.example/x', host: 'legacy.example' });
    // Exempt for now, so the retry is not upgraded again.
    expect(blocker.getHttpsExceptions()).toContain('legacy.example');
  });

  it('never falls back on a certificate error', () => {
    blocker.upgradeToHttps('http://bank.example/', 'mainFrame');
    expect(blocker.fallbackForFailedUpgrade('https://bank.example/', -202)).toBeNull();
    expect(blocker.getHttpsExceptions()).toEqual([]);
  });

  it('ignores failures it did not cause', () => {
    expect(blocker.fallbackForFailedUpgrade('https://random.example/', -102)).toBeNull();
  });

  it('keeps the exception once the HTTP page loads', () => {
    blocker.upgradeToHttps('http://legacy.example/', 'mainFrame');
    blocker.fallbackForFailedUpgrade('https://legacy.example/', -104);
    blocker.confirmFallback('http://legacy.example/');

    expect(readPrefs().httpsExceptions).toEqual(['legacy.example']);
    const reloaded = new AdBlocker();
    reloaded.loadPreferences();
    expect(reloaded.getHttpsExceptions()).toContain('legacy.example');
  });

  it('drops the exception when the HTTP page fails too', () => {
    blocker.upgradeToHttps('http://dead.example/', 'mainFrame');
    blocker.fallbackForFailedUpgrade('https://dead.example/', -105);
    blocker.rejectFallback('http://dead.example/');

    expect(blocker.getHttpsExceptions()).toEqual([]);
  });

  it('does not remove an exception that was already stored', () => {
    blocker.addHttpsException('legacy.example');
    blocker.upgradeToHttps('http://other.example/', 'mainFrame');
    blocker.fallbackForFailedUpgrade('https://other.example/', -102);
    blocker.rejectFallback('http://other.example/');

    expect(blocker.getHttpsExceptions()).toEqual(['legacy.example']);
  });
});

describe('HTTPS exceptions', () => {
  it('normalises and sorts entries', () => {
    blocker.addHttpsException('https://B.example/path');
    blocker.addHttpsException('a.example');
    expect(blocker.getHttpsExceptions()).toEqual(['a.example', 'b.example']);
  });

  it('ignores empty or malformed input', () => {
    expect(blocker.addHttpsException('   ')).toEqual([]);
    expect(blocker.addHttpsException('http://')).toEqual([]);
  });

  it('removes an entry and persists the change', () => {
    blocker.addHttpsException('example.com');
    blocker.removeHttpsException('example.com');
    expect(blocker.getHttpsExceptions()).toEqual([]);
    expect(readPrefs().httpsExceptions).toEqual([]);
  });
});
