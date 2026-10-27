import { describe, expect, it } from 'vitest';
import {
  shouldHibernate,
  selectTabsToHibernate,
  type MemoryGuardTab,
} from './tabLifecycle';

const NOW = 1_000_000;
const IDLE = 60_000;

function tab(overrides: Partial<MemoryGuardTab> = {}): MemoryGuardTab {
  return {
    id: 'tab',
    isPinned: false,
    isAudible: false,
    inCall: false,
    hasUnsavedInput: false,
    hasNotificationPermission: false,
    lastActiveAt: NOW - IDLE - 1,
    state: 'live',
    url: 'https://example.com/',
    ...overrides,
  };
}

describe('tab lifecycle: behavior-based protection', () => {
  it('hibernates an idle background tab', () => {
    expect(shouldHibernate(tab(), NOW, IDLE, 'other')).toBe(true);
  });

  it('protects a tab that is playing audio', () => {
    expect(shouldHibernate(tab({ isAudible: true }), NOW, IDLE, 'other')).toBe(false);
  });

  it('protects a tab that is in a call', () => {
    expect(shouldHibernate(tab({ inCall: true }), NOW, IDLE, 'other')).toBe(false);
  });

  it('protects a tab holding unsaved typed input', () => {
    expect(shouldHibernate(tab({ hasUnsavedInput: true }), NOW, IDLE, 'other')).toBe(false);
  });

  it('protects a tab whose site has notifications granted', () => {
    expect(shouldHibernate(tab({ hasNotificationPermission: true }), NOW, IDLE, 'other')).toBe(false);
  });

  it('protects pinned and active tabs', () => {
    expect(shouldHibernate(tab({ isPinned: true }), NOW, IDLE, 'other')).toBe(false);
    expect(shouldHibernate(tab({ id: 'active' }), NOW, IDLE, 'active')).toBe(false);
  });

  it('does not protect a site just because it used to be on a keepalive list', () => {
    for (const url of [
      'https://www.facebook.com/',
      'https://www.instagram.com/',
      'https://x.com/home',
      'https://console.aws.amazon.com/console/home',
      'https://www.notion.so/team/page',
      'https://app.slack.com/client/T1/C2',
      'https://mail.google.com/mail/u/0/',
    ]) {
      expect(shouldHibernate(tab({ url }), NOW, IDLE, 'other')).toBe(true);
    }
  });

  it('protects domains on the user never-hibernate list', () => {
    const options = { neverHibernate: ['notion.so', 'example.com'] };
    expect(shouldHibernate(tab({ url: 'https://app.notion.so/x' }), NOW, IDLE, 'other', options)).toBe(false);
    expect(shouldHibernate(tab({ url: 'https://example.com/' }), NOW, IDLE, 'other', options)).toBe(false);
    expect(shouldHibernate(tab({ url: 'https://other.com/' }), NOW, IDLE, 'other', options)).toBe(true);
  });

  it('never hibernates a tab that is not live', () => {
    expect(shouldHibernate(tab({ state: 'hibernated' }), NOW, IDLE, 'other')).toBe(false);
  });
});

describe('tab lifecycle: budget selection', () => {
  it('reclaims idle tabs first', () => {
    const tabs = [
      tab({ id: 'idle' }),
      tab({ id: 'fresh', lastActiveAt: NOW }),
    ];
    expect(selectTabsToHibernate(tabs, NOW, IDLE, 10, 'active')).toEqual(['idle']);
  });

  it('enforces the live cap by reclaiming the oldest unprotected tabs', () => {
    const tabs = [
      tab({ id: 'oldest', lastActiveAt: NOW - 5 }),
      tab({ id: 'older', lastActiveAt: NOW - 4 }),
      tab({ id: 'newer', lastActiveAt: NOW - 3 }),
      tab({ id: 'newest', lastActiveAt: NOW - 2 }),
      tab({ id: 'active', lastActiveAt: NOW }),
    ];
    expect(selectTabsToHibernate(tabs, NOW, IDLE, 2, 'active')).toEqual(['oldest', 'older', 'newer']);
  });

  it('never reclaims a protected tab to meet the cap', () => {
    const tabs = [
      tab({ id: 'audible', isAudible: true, lastActiveAt: NOW - 9 }),
      tab({ id: 'call', inCall: true, lastActiveAt: NOW - 8 }),
      tab({ id: 'typed', hasUnsavedInput: true, lastActiveAt: NOW - 7 }),
      tab({ id: 'pinned', isPinned: true, lastActiveAt: NOW - 6 }),
      tab({ id: 'active', lastActiveAt: NOW }),
    ];
    expect(selectTabsToHibernate(tabs, NOW, IDLE, 1, 'active')).toEqual([]);
  });

  it('honours the never-hibernate list under cap pressure', () => {
    const tabs = [
      tab({ id: 'protected', url: 'https://example.com/', lastActiveAt: NOW - 9 }),
      tab({ id: 'free', url: 'https://other.com/', lastActiveAt: NOW - 8 }),
      tab({ id: 'active', lastActiveAt: NOW }),
    ];
    expect(selectTabsToHibernate(tabs, NOW, IDLE, 1, 'active', { neverHibernate: ['example.com'] })).toEqual(['free']);
  });
});
