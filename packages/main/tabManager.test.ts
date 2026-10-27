import { describe, expect, it } from 'vitest';
import { TabManager, type TabView } from './tabManager';
import type { TabStateSnapshot, ViewBounds } from '../shared/tabModel';

class FakeView implements TabView {
  loaded: string[] = [];
  bounds: ViewBounds;
  visible = false;
  destroyed = false;
  focused = false;
  reloadCount = 0;
  backCount = 0;
  forwardCount = 0;
  muted = false;

  constructor(bounds: ViewBounds) {
    this.bounds = bounds;
  }

  loadURL(url: string): void {
    this.loaded.push(url);
  }
  setBounds(bounds: ViewBounds): void {
    this.bounds = bounds;
  }
  setVisible(visible: boolean): void {
    this.visible = visible;
  }
  focus(): void {
    this.focused = true;
  }
  reload(): void {
    this.reloadCount += 1;
  }
  goBack(): void {
    this.backCount += 1;
  }
  goForward(): void {
    this.forwardCount += 1;
  }
  setAudioMuted(muted: boolean): void {
    this.muted = muted;
  }
  destroy(): void {
    this.destroyed = true;
  }
}

function setup(options: { idleHibernateMs?: number; maxLiveTabs?: number } = {}) {
  let now = 1_000;
  let nextId = 0;
  const views: FakeView[] = [];
  const snapshots: TabStateSnapshot[] = [];
  const queue: Array<() => void> = [];

  const manager = new TabManager({
    createView: (_tab, bounds) => {
      const view = new FakeView(bounds);
      views.push(view);
      return view;
    },
    onStateChange: (snapshot) => snapshots.push(snapshot),
    now: () => now,
    newId: () => `tab-${++nextId}`,
    scheduleFlush: (flush) => queue.push(flush),
    idleHibernateMs: options.idleHibernateMs ?? 10_000,
    maxLiveTabs: options.maxLiveTabs ?? 20,
  });

  const flush = () => {
    while (queue.length > 0) queue.shift()?.();
  };
  const advance = (ms: number) => {
    now += ms;
  };

  return { manager, views, snapshots, flush, advance, setNow: (value: number) => { now = value; } };
}

function openTab(manager: TabManager, url = 'https://example.com', spaceId = 'space-1') {
  return manager.open({ url, spaceId, profileId: 'default' });
}

describe('TabManager', () => {
  it('opens a tab, loads a normalized URL and activates it', () => {
    const { manager, views, snapshots, flush } = setup();

    const tab = openTab(manager, 'example.com');

    expect(manager.getActiveTabId()).toBe(tab.id);
    expect(tab.url).toBe('https://example.com');
    expect(views).toHaveLength(1);
    expect(views[0].loaded).toEqual(['https://example.com']);
    expect(views[0].visible).toBe(true);

    flush();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].activeTabId).toBe(tab.id);
  });

  it('opens a background tab without stealing focus', () => {
    const { manager, views, flush } = setup();
    const first = openTab(manager, 'https://a.com');
    flush();

    const second = manager.open({ url: 'https://b.com', spaceId: 'space-1', profileId: 'default', activate: false });

    expect(manager.getActiveTabId()).toBe(first.id);
    expect(views[1].visible).toBe(false);
    expect(manager.list().map((tab) => tab.id)).toEqual([first.id, second.id]);
  });

  it('switches visibility and last-active time on activate', () => {
    const { manager, views, advance } = setup();
    const first = openTab(manager, 'https://a.com');
    const second = openTab(manager, 'https://b.com');

    advance(500);
    manager.activate(first.id);

    expect(views[0].visible).toBe(true);
    expect(views[1].visible).toBe(false);
    expect(manager.get(first.id)?.lastActiveAt).toBe(1_500);
    expect(manager.getActiveTabId()).toBe(first.id);
    expect(second.id).not.toBe(first.id);
  });

  it('closes the active tab and activates its right-hand neighbour', () => {
    const { manager, views } = setup();
    const a = openTab(manager, 'https://a.com');
    const b = openTab(manager, 'https://b.com');
    const c = openTab(manager, 'https://c.com');

    manager.activate(b.id);
    manager.close(b.id);

    expect(manager.get(b.id)).toBeUndefined();
    expect(manager.getActiveTabId()).toBe(c.id);
    expect(views[1].destroyed).toBe(true);
    expect(manager.list().map((tab) => tab.id)).toEqual([a.id, c.id]);
  });

  it('closes the last tab without an active tab', () => {
    const { manager } = setup();
    const only = openTab(manager);

    manager.close(only.id);

    expect(manager.getActiveTabId()).toBeNull();
    expect(manager.list()).toEqual([]);
  });

  it('strips tracking parameters when opening and navigating', () => {
    const { manager, views } = setup();

    const tab = openTab(manager, 'https://example.com/article?utm_source=news&id=1');

    expect(tab.url).toBe('https://example.com/article?id=1');
    expect(views[0].loaded).toEqual(['https://example.com/article?id=1']);

    manager.navigate(tab.id, 'https://example.org/?fbclid=x&q=orb');

    expect(tab.url).toBe('https://example.org/?q=orb');
    expect(views[0].loaded.at(-1)).toBe('https://example.org/?q=orb');
  });

  it('navigates and reloads through the view', () => {
    const { manager, views } = setup();
    const tab = openTab(manager, 'https://a.com');

    manager.navigate(tab.id, 'b.com');
    manager.reload(tab.id);
    manager.goBack(tab.id);
    manager.goForward(tab.id);

    expect(manager.get(tab.id)?.url).toBe('https://b.com');
    expect(views[0].loaded).toEqual(['https://a.com', 'https://b.com']);
    expect(views[0].reloadCount).toBe(1);
    expect(views[0].backCount).toBe(1);
    expect(views[0].forwardCount).toBe(1);
  });

  it('maps view events onto tab state', () => {
    const { manager } = setup();
    const tab = openTab(manager);

    manager.handleViewEvent(tab.id, { type: 'did-start-loading' });
    expect(manager.get(tab.id)?.isLoading).toBe(true);

    manager.handleViewEvent(tab.id, {
      type: 'did-stop-loading',
      canGoBack: true,
      canGoForward: false,
    });
    manager.handleViewEvent(tab.id, { type: 'page-title-updated', title: 'Example' });
    manager.handleViewEvent(tab.id, { type: 'page-favicon-updated', favicon: 'https://example.com/f.ico' });
    manager.handleViewEvent(tab.id, { type: 'audible-changed', audible: true });

    const updated = manager.get(tab.id);
    expect(updated?.isLoading).toBe(false);
    expect(updated?.canGoBack).toBe(true);
    expect(updated?.title).toBe('Example');
    expect(updated?.favicon).toBe('https://example.com/f.ico');
    expect(updated?.isAudible).toBe(true);
  });

  it('mutes a tab and carries the state into a recreated view', () => {
    const { manager, views } = setup();
    const tab = openTab(manager, 'https://a.com');

    manager.setMuted(tab.id, true);
    expect(manager.get(tab.id)?.isMuted).toBe(true);
    expect(views[0].muted).toBe(true);

    manager.hibernate(tab.id);
    manager.wake(tab.id);
    expect(views[1].muted).toBe(true);
  });

  it('hibernates by destroying the view and wakes by recreating it', () => {
    const { manager, views } = setup();
    const tab = openTab(manager, 'https://a.com');

    manager.hibernate(tab.id);

    expect(manager.get(tab.id)?.lifecycle).toBe('hibernated');
    expect(views[0].destroyed).toBe(true);
    expect(manager.get(tab.id)?.url).toBe('https://a.com');

    manager.wake(tab.id);

    expect(manager.get(tab.id)?.lifecycle).toBe('live');
    expect(views).toHaveLength(2);
    expect(views[1].loaded).toEqual(['https://a.com']);
  });

  it('reclaims idle tabs but protects active, pinned and audible ones', () => {
    const { manager, advance } = setup({ idleHibernateMs: 1_000 });
    const active = openTab(manager, 'https://active.com');
    const pinned = manager.open({
      url: 'https://pinned.com',
      spaceId: 'space-1',
      profileId: 'default',
      isPinned: true,
    });
    const audible = openTab(manager, 'https://audible.com');
    const idle = openTab(manager, 'https://idle.com');

    manager.activate(active.id);
    manager.handleViewEvent(audible.id, { type: 'audible-changed', audible: true });

    advance(5_000);
    const hibernated = manager.applyMemoryBudget();

    expect(hibernated).toContain(idle.id);
    expect(hibernated).not.toContain(active.id);
    expect(hibernated).not.toContain(audible.id);
    expect(hibernated).not.toContain(pinned.id);
    expect(manager.get(pinned.id)?.lifecycle).toBe('live');
  });

  it('hibernates the oldest tabs when over the live cap', () => {
    const { manager } = setup({ maxLiveTabs: 1, idleHibernateMs: 60_000 });
    const a = openTab(manager, 'https://a.com');
    const b = openTab(manager, 'https://b.com');
    const c = openTab(manager, 'https://c.com');
    manager.activate(c.id);

    const hibernated = manager.applyMemoryBudget();

    expect(hibernated).toEqual([a.id, b.id]);
    expect(manager.get(c.id)?.lifecycle).toBe('live');
  });

  it('keeps the requested order and reports it in snapshots', () => {
    const { manager, snapshots, flush } = setup();
    const a = openTab(manager, 'https://a.com');
    const b = openTab(manager, 'https://b.com');

    manager.reorder([b.id, a.id]);
    flush();

    expect(snapshots.at(-1)?.tabs.map((tab) => tab.id)).toEqual([b.id, a.id]);
  });

  it('batches state changes into one snapshot per tick', () => {
    const { manager, snapshots, flush } = setup();
    const tab = openTab(manager);

    manager.handleViewEvent(tab.id, { type: 'did-start-loading' });
    manager.handleViewEvent(tab.id, { type: 'page-title-updated', title: 'One' });
    manager.handleViewEvent(tab.id, { type: 'page-title-updated', title: 'Two' });

    expect(snapshots).toHaveLength(0);
    flush();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].tabs[0].title).toBe('Two');
  });

  it('clamps bounds and applies per-tab overrides', () => {
    const { manager, views } = setup();
    const a = openTab(manager, 'https://a.com');
    const b = openTab(manager, 'https://b.com');

    manager.setBounds({ x: -10, y: 4.6, width: 800.4, height: Number.NaN });

    expect(manager.getBounds()).toEqual({ x: 0, y: 5, width: 800, height: 0 });
    expect(views[0].bounds).toEqual({ x: 0, y: 5, width: 800, height: 0 });
    expect(views[1].bounds).toEqual({ x: 0, y: 5, width: 800, height: 0 });

    manager.setTabBounds(b.id, { x: 400, y: 0, width: 400, height: 600 });
    expect(views[1].bounds).toEqual({ x: 400, y: 0, width: 400, height: 600 });
    expect(views[0].bounds).toEqual({ x: 0, y: 5, width: 800, height: 0 });
  });

  it('clears a split-pane bounds override', () => {
    const { manager, views } = setup();
    const a = openTab(manager, 'https://a.com');
    const b = openTab(manager, 'https://b.com');
    manager.setBounds({ x: 0, y: 0, width: 1000, height: 700 });

    manager.setTabBounds(a.id, { x: 0, y: 0, width: 500, height: 700 });
    manager.setTabBounds(b.id, { x: 508, y: 0, width: 492, height: 700 });
    expect(views[0].bounds.width).toBe(500);

    manager.clearTabBounds(b.id);

    expect(views[1].bounds).toEqual({ x: 0, y: 0, width: 1000, height: 700 });
    // The other pane keeps its override until it is cleared too.
    expect(views[0].bounds.width).toBe(500);
  });

  it('destroys every view on shutdown', () => {
    const { manager, views } = setup();
    openTab(manager, 'https://a.com');
    openTab(manager, 'https://b.com');

    manager.destroy();

    expect(views.every((view) => view.destroyed)).toBe(true);
    expect(manager.list()).toEqual([]);
  });
});
