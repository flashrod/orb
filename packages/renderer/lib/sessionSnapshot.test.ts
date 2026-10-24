import { describe, expect, it } from 'vitest';
import { captureSession, parseSessionSnapshot, resolveRestoreTabs, restorableTabs, type SessionSnapshot } from './sessionSnapshot';
import type { Tab, TabGroup } from '../stores/tabs';

function tab(url: string, overrides: Partial<Tab> = {}): Tab {
  return {
    id: `id-${url}`,
    spaceId: 'space-1',
    url,
    title: 'Title',
    favicon: '',
    isPinned: false,
    isActive: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const group: TabGroup = { id: 'g1', spaceId: 'space-1', name: 'Group', color: '#000', collapsed: false, createdAt: 1 };

describe('captureSession', () => {
  it('does not save an empty session', () => {
    expect(captureSession([], [], null)).toBeNull();
  });

  it('copies tabs and groups with a timestamp', () => {
    const tabs = [tab('https://example.com/')];
    const snapshot = captureSession(tabs, [group], 'id-https://example.com/', 1234);
    expect(snapshot).toMatchObject({ savedAt: 1234, activeTabId: 'id-https://example.com/' });
    expect(snapshot?.tabs).toHaveLength(1);
    expect(snapshot?.tabs[0]).not.toBe(tabs[0]);
    expect(snapshot?.groups).toHaveLength(1);
  });

  it('never saves a blank-only session and drops blank tabs from a real one', () => {
    expect(captureSession([tab('about:blank')], [], null)).toBeNull();
    const snapshot = captureSession([tab('about:blank'), tab('https://example.com/')], [], null);
    expect(snapshot?.tabs.map((entry) => entry.url)).toEqual(['https://example.com/']);
  });
});

describe('parseSessionSnapshot', () => {
  it('rejects missing, malformed and empty snapshots', () => {
    expect(parseSessionSnapshot(null)).toBeNull();
    expect(parseSessionSnapshot('{')).toBeNull();
    expect(parseSessionSnapshot(JSON.stringify({ tabs: [] }))).toBeNull();
    expect(parseSessionSnapshot(JSON.stringify({ tabs: [{ url: 'about:blank' }] }))).toBeNull();
  });

  it('keeps valid tabs and defaults missing fields', () => {
    const snapshot = parseSessionSnapshot(JSON.stringify({
      savedAt: 99,
      tabs: [{ url: 'https://example.com/', title: 'Example' }, { url: 42 }, { nope: true }],
      groups: [],
    }));
    expect(snapshot?.tabs).toEqual([
      { url: 'https://example.com/', title: 'Example', favicon: '', isPinned: false, spaceId: '' },
    ]);
    expect(snapshot?.savedAt).toBe(99);
  });
});

describe('restorableTabs', () => {
  const snapshot: SessionSnapshot = {
    savedAt: 1,
    activeTabId: null,
    groups: [],
    tabs: [
      { url: 'https://a.test/', title: 'A', favicon: '', isPinned: false, spaceId: 'space-1' },
      { url: 'https://b.test/', title: 'B', favicon: '', isPinned: true, spaceId: 'space-1' },
      { url: 'https://a.test/', title: 'A again', favicon: '', isPinned: false, spaceId: 'space-1' },
      { url: 'https://open.test/', title: 'Open', favicon: '', isPinned: false, spaceId: 'space-1' },
    ],
  };

  it('skips tabs that are already open and duplicate URLs', () => {
    const pending = restorableTabs(snapshot, ['https://open.test/']);
    expect(pending.map((entry) => entry.url)).toEqual(['https://a.test/', 'https://b.test/']);
  });

  it('returns nothing when every tab is already open', () => {
    expect(restorableTabs(snapshot, ['https://a.test/', 'https://b.test/', 'https://open.test/'])).toHaveLength(0);
  });
});

describe('resolveRestoreTabs', () => {
  const snapshot: SessionSnapshot = {
    savedAt: 1,
    activeTabId: null,
    groups: [],
    tabs: [
      { url: 'https://a.test/', title: 'A', favicon: '', isPinned: false, spaceId: 'space-1' },
      { url: 'https://b.test/', title: '', favicon: '', isPinned: true, spaceId: 'missing-space' },
    ],
  };

  it('keeps known spaces and moves orphaned tabs to the fallback', () => {
    const restored = resolveRestoreTabs(snapshot, [], ['space-1', 'space-2'], 'space-2');
    expect(restored.map((tab) => [tab.url, tab.spaceId, tab.isActive])).toEqual([
      ['https://a.test/', 'space-1', true],
      ['https://b.test/', 'space-2', true],
    ]);
    expect(restored[1].isPinned).toBe(true);
    expect(restored[1].title).toBe('https://b.test/');
  });

  it('drops tabs when no space can hold them', () => {
    expect(resolveRestoreTabs(snapshot, [], [], null)).toHaveLength(0);
  });
});
