import {
  clampBounds,
  nextActiveAfterClose,
  normalizeUrl,
  type TabOpenInput,
  type TabRecord,
  type TabStateSnapshot,
  type ViewBounds,
} from '../shared/tabModel';
import {
  MEMORY_GUARD_IDLE_MS,
  MEMORY_GUARD_MAX_LIVE_TABS,
  selectTabsToHibernate,
} from '../shared/tabLifecycle';

/**
 * The native view a tab owns. Implemented by WebContentsView in the main
 * process and by a fake in tests, so TabManager itself stays Electron-free.
 */
export interface TabView {
  loadURL(url: string): void;
  setBounds(bounds: ViewBounds): void;
  setVisible(visible: boolean): void;
  focus(): void;
  reload(): void;
  goBack(): void;
  goForward(): void;
  destroy(): void;
}

export type TabViewEvent =
  | { type: 'did-start-loading' }
  | { type: 'did-stop-loading'; canGoBack: boolean; canGoForward: boolean }
  | { type: 'did-navigate'; url: string; canGoBack: boolean; canGoForward: boolean }
  | { type: 'page-title-updated'; title: string }
  | { type: 'page-favicon-updated'; favicon: string }
  | { type: 'audible-changed'; audible: boolean };

export interface TabManagerDeps {
  createView(tab: TabRecord, bounds: ViewBounds): TabView;
  onStateChange(snapshot: TabStateSnapshot): void;
  now?: () => number;
  newId?: () => string;
  scheduleFlush?: (flush: () => void) => void;
  idleHibernateMs?: number;
  maxLiveTabs?: number;
}

/**
 * Owns tab state for the native-view browser.
 *
 * The renderer sends intents (open/activate/close/navigate) and receives one
 * batched snapshot per tick; it never talks to a view directly. Views are
 * created lazily on activation and destroyed on hibernate/close, which is what
 * makes pre-warming and hibernation possible.
 */
export class TabManager {
  private readonly deps: TabManagerDeps;
  private readonly now: () => number;
  private readonly newId: () => string;
  private readonly scheduleFlush: (flush: () => void) => void;
  private readonly idleHibernateMs: number;
  private readonly maxLiveTabs: number;

  private readonly tabs = new Map<string, TabRecord>();
  private readonly views = new Map<string, TabView>();
  private readonly boundsByTab = new Map<string, ViewBounds>();
  private order: string[] = [];
  private activeTabId: string | null = null;
  private bounds: ViewBounds = { x: 0, y: 0, width: 0, height: 0 };
  private flushScheduled = false;
  private destroyed = false;

  constructor(deps: TabManagerDeps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.newId = deps.newId ?? (() => crypto.randomUUID());
    this.scheduleFlush = deps.scheduleFlush ?? ((flush) => setImmediate(flush));
    this.idleHibernateMs = deps.idleHibernateMs ?? MEMORY_GUARD_IDLE_MS;
    this.maxLiveTabs = deps.maxLiveTabs ?? MEMORY_GUARD_MAX_LIVE_TABS;
  }

  // ---------------------------------------------------------------- intents

  open(input: TabOpenInput): TabRecord {
    if (input.id && this.tabs.has(input.id)) return this.tabs.get(input.id)!;
    const now = this.now();
    const tab: TabRecord = {
      id: input.id ?? this.newId(),
      spaceId: input.spaceId,
      profileId: input.profileId,
      url: normalizeUrl(input.url),
      title: 'New Tab',
      favicon: '',
      isPinned: Boolean(input.isPinned),
      isLoading: true,
      canGoBack: false,
      canGoForward: false,
      isAudible: false,
      lifecycle: 'live',
      lastActiveAt: now,
      createdAt: now,
    };

    this.tabs.set(tab.id, tab);
    this.order.push(tab.id);
    this.createViewFor(tab);
    if (input.activate !== false) this.activate(tab.id);
    this.markDirty();
    return tab;
  }

  activate(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;

    for (const [tabId, view] of this.views) {
      view.setVisible(tabId === id);
    }
    if (tab.lifecycle === 'hibernated') {
      tab.lifecycle = 'live';
      this.createViewFor(tab);
    }

    tab.lastActiveAt = this.now();
    this.activeTabId = id;
    this.views.get(id)?.focus();
    this.markDirty();
  }

  close(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;

    const nextActive = nextActiveAfterClose(this.list(), id, this.activeTabId);
    this.destroyView(id);
    this.tabs.delete(id);
    this.boundsByTab.delete(id);
    this.order = this.order.filter((tabId) => tabId !== id);

    if (this.activeTabId === id) {
      this.activeTabId = null;
      if (nextActive) this.activate(nextActive);
    }
    this.markDirty();
  }

  navigate(id: string, url: string): void {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const nextUrl = normalizeUrl(url);
    tab.url = nextUrl;
    tab.isLoading = true;
    this.viewFor(tab)?.loadURL(nextUrl);
    this.markDirty();
  }

  reload(id: string): void {
    this.views.get(id)?.reload();
  }

  goBack(id: string): void {
    this.views.get(id)?.goBack();
  }

  goForward(id: string): void {
    this.views.get(id)?.goForward();
  }

  reorder(ids: string[]): void {
    const known = ids.filter((id) => this.tabs.has(id));
    const missing = this.order.filter((id) => !known.includes(id));
    this.order = [...known, ...missing];
    this.markDirty();
  }

  setBounds(bounds: ViewBounds): void {
    this.bounds = clampBounds(bounds);
    for (const [id, view] of this.views) {
      const tabBounds = this.boundsByTab.get(id) ?? this.bounds;
      view.setBounds(tabBounds);
    }
  }

  setTabBounds(id: string, bounds: ViewBounds): void {
    const clamped = clampBounds(bounds);
    this.boundsByTab.set(id, clamped);
    this.views.get(id)?.setBounds(clamped);
  }

  // ------------------------------------------------------------- view events

  handleViewEvent(id: string, event: TabViewEvent): void {
    const tab = this.tabs.get(id);
    if (!tab) return;

    switch (event.type) {
      case 'did-start-loading':
        tab.isLoading = true;
        break;
      case 'did-stop-loading':
        tab.isLoading = false;
        tab.canGoBack = event.canGoBack;
        tab.canGoForward = event.canGoForward;
        break;
      case 'did-navigate':
        tab.url = event.url;
        tab.canGoBack = event.canGoBack;
        tab.canGoForward = event.canGoForward;
        break;
      case 'page-title-updated':
        if (event.title.trim()) tab.title = event.title;
        break;
      case 'page-favicon-updated':
        if (event.favicon) tab.favicon = event.favicon;
        break;
      case 'audible-changed':
        tab.isAudible = event.audible;
        break;
    }
    this.markDirty();
  }

  // ------------------------------------------------------------- hibernation

  hibernate(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab || tab.lifecycle === 'hibernated') return;
    this.destroyView(id);
    tab.lifecycle = 'hibernated';
    tab.isLoading = false;
    this.markDirty();
  }

  wake(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab || tab.lifecycle !== 'hibernated') return;
    tab.lifecycle = 'live';
    tab.lastActiveAt = this.now();
    this.createViewFor(tab);
    this.views.get(id)?.setVisible(this.activeTabId === id);
    this.markDirty();
  }

  /**
   * Returns the tabs the memory budget would reclaim right now, without
   * touching them, so the caller can capture a snapshot first.
   */
  planMemoryBudget(): string[] {
    const now = this.now();
    const candidates = this.list()
      .filter((tab) => tab.lifecycle === 'live')
      .map((tab) => ({
        id: tab.id,
        isPinned: tab.isPinned,
        isAudible: tab.isAudible,
        inCall: false,
        lastActiveAt: tab.lastActiveAt,
        state: 'live' as const,
      }));

    const ids = selectTabsToHibernate(
      candidates,
      now,
      this.idleHibernateMs,
      this.maxLiveTabs,
      this.activeTabId,
    );
    return ids;
  }

  /** Reclaims the tabs chosen by `planMemoryBudget`. */
  applyMemoryBudget(): string[] {
    const ids = this.planMemoryBudget();
    for (const id of ids) this.hibernate(id);
    return ids;
  }

  // ----------------------------------------------------------------- queries

  get(id: string): TabRecord | undefined {
    return this.tabs.get(id);
  }

  list(): TabRecord[] {
    return this.order
      .map((id) => this.tabs.get(id))
      .filter((tab): tab is TabRecord => Boolean(tab));
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  getBounds(): ViewBounds {
    return this.bounds;
  }

  snapshot(): TabStateSnapshot {
    return {
      tabs: this.list().map((tab) => ({ ...tab })),
      activeTabId: this.activeTabId,
    };
  }

  destroy(): void {
    this.destroyed = true;
    for (const id of [...this.views.keys()]) this.destroyView(id);
    this.tabs.clear();
    this.order = [];
    this.activeTabId = null;
  }

  // --------------------------------------------------------------- internals

  private viewFor(tab: TabRecord): TabView | undefined {
    const existing = this.views.get(tab.id);
    if (existing) return existing;
    if (tab.lifecycle === 'hibernated') return undefined;
    return this.createViewFor(tab);
  }

  private createViewFor(tab: TabRecord): TabView | undefined {
    if (this.destroyed) return undefined;
    const view = this.deps.createView(tab, this.boundsByTab.get(tab.id) ?? this.bounds);
    this.views.set(tab.id, view);
    view.loadURL(tab.url);
    view.setVisible(this.activeTabId === tab.id);
    return view;
  }

  private destroyView(id: string): void {
    const view = this.views.get(id);
    if (!view) return;
    this.views.delete(id);
    view.destroy();
  }

  private markDirty(): void {
    if (this.flushScheduled || this.destroyed) return;
    this.flushScheduled = true;
    this.scheduleFlush(() => {
      this.flushScheduled = false;
      if (this.destroyed) return;
      this.deps.onStateChange(this.snapshot());
    });
  }
}
