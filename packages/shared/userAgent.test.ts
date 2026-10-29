import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildUserAgent, isSpoofedUserAgent } from './userAgent';

const originalChrome = process.versions.chrome;

beforeEach(() => {
  Object.defineProperty(process.versions, 'chrome', {
    value: '120.0.6099.109',
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(process.versions, 'chrome', {
    value: originalChrome,
    configurable: true,
  });
});

describe('userAgent builder', () => {
  it('builds a Chrome-style UA without Orb or Electron', () => {
    const ua = buildUserAgent();
    expect(ua).not.toMatch(/orb/i);
    expect(ua).not.toMatch(/electron/i);
    expect(ua).toMatch(/Chrome\/[\d]+\.0\.0\.0 Safari\/537\.36/);
    expect(ua).toMatch(/Macintosh; Intel Mac OS X 10_15_7/);
    expect(ua).toMatch(/AppleWebKit\/537\.36/);
  });

  it('uses the Chromium major version from process.versions.chrome', () => {
    const ua = buildUserAgent();
    const expectedMajor = process.versions.chrome.split('.')[0];
    expect(ua).toContain(`Chrome/${expectedMajor}.0.0.0`);
  });

  it('isSpoofedUserAgent detects Orb and Electron', () => {
    expect(isSpoofedUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
    expect(isSpoofedUserAgent('Mozilla/5.0 Orb/1.0.0 Safari/537.36')).toBe(true);
    expect(isSpoofedUserAgent('Mozilla/5.0 Electron/45.0.0 Safari/537.36')).toBe(true);
    expect(isSpoofedUserAgent('ORB/1.0.0')).toBe(true);
    expect(isSpoofedUserAgent('ELECTRON/45.0.0')).toBe(true);
  });

  it('isSpoofedUserAgent is case-insensitive', () => {
    expect(isSpoofedUserAgent('Orb/1.0')).toBe(true);
    expect(isSpoofedUserAgent('orb/1.0')).toBe(true);
    expect(isSpoofedUserAgent('Electron/45.0')).toBe(true);
    expect(isSpoofedUserAgent('electron/45.0')).toBe(true);
  });
});
