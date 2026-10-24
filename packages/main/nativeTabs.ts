import path from 'node:path';
import { BrowserWindow, WebContentsView, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { TabManager, type TabView, type TabViewEvent } from './tabManager';
import { orbSessionFor, type SessionContext } from './sessions';
import { profilePartition } from '../shared/profiles';
import { clampBounds, type TabOpenInput, type TabStateSnapshot, type ViewBounds } from '../shared/tabModel';
import { initAdBlocker } from './adBlocker';
import { PICK_ELEMENT_SCRIPT, type PickedElement } from '../shared/elementPicker';

const PRELOAD_DIR = path.join(__dirname, 'preload');

/**
 * Owns the native page views for one window: one WebContentsView per live tab,
 * stacked above the React shell and bounded to the page area the renderer
 * reports.
 */
export class NativeTabHost {
  readonly manager: TabManager;
  private readonly window: BrowserWindow;
  private readonly ctx: SessionContext;
  private readonly views = new Map<string, WebContentsView>();
  private readonly snapshots = new Map<string, string>();
  private split: { id: string; bounds: ViewBounds } | null = null;
  private pageVisible = true;
  private desiredPageVisible = true;
  private closed = false;

  constructor(window: BrowserWindow, ctx: SessionContext) {
    this.window = window;
    this.ctx = ctx;
    this.manager = new TabManager({
      createView: (tab, bounds) => this.createView(tab.id, tab.url, tab.profileId, bounds),
      onStateChange: (snapshot) => {
        this.applyVisibility();
        this.pushState(snapshot);
      },
    });

    window.on('closed', () => this.destroy());
  }

  // ------------------------------------------------------------- intents

  open(input: TabOpenInput): void {
    this.manager.open(input);
  }

  activate(id: string): void {
    this.manager.activate(id);
  }

  close(id: string): void {
    if (this.split?.id === id) this.split = null;
    this.manager.close(id);
    this.snapshots.delete(id);
  }

  navigate(id: string, url: string): void {
    this.manager.navigate(id, url);
  }

  reload(id: string): void {
    this.manager.reload(id);
  }

  goBack(id: string): void {
    this.manager.goBack(id);
  }

  goForward(id: string): void {
    this.manager.goForward(id);
  }

  reorder(ids: string[]): void {
    this.manager.reorder(ids);
  }

  /**
   * Sets the page rectangle. When a second pane is supplied the two tabs are
   * shown side by side (split view); every other view stays hidden.
   */
  setBounds(bounds: ViewBounds, secondary?: { id: string; bounds: ViewBounds } | null): void {
    const previousSplitId = this.split?.id;
    this.manager.setBounds(bounds);
    if (previousSplitId) this.manager.clearTabBounds(previousSplitId);
    const activeId = this.manager.getActiveTabId();
    this.split = secondary && secondary.id !== activeId
      ? { id: secondary.id, bounds: clampBounds(secondary.bounds) }
      : null;
    if (this.split) this.manager.setTabBounds(this.split.id, this.split.bounds);
    this.applyVisibility();
  }

  setTabBounds(id: string, bounds: ViewBounds): void {
    this.manager.setTabBounds(id, bounds);
  }

  async setPageVisible(visible: boolean): Promise<void> {
    this.desiredPageVisible = visible;
    if (visible) {
      this.pageVisible = true;
      this.applyVisibility();
      return;
    }
    // Shell UI is about to cover the page: freeze a frame first so the gap
    // shows the page instead of white.
    const activeId = this.manager.getActiveTabId();
    if (activeId) await this.captureSnapshot(activeId);
    // The overlay may have closed while the snapshot was being captured.
    if (this.desiredPageVisible) return;
    this.pageVisible = false;
    this.applyVisibility();
  }

  snapshot(): TabStateSnapshot {
    return this.manager.snapshot();
  }

  async hibernate(id: string): Promise<void> {
    await this.captureSnapshot(id);
    if (this.split?.id === id) this.split = null;
    this.manager.hibernate(id);
  }

  wake(id: string): void {
    this.manager.wake(id);
  }

  /**
   * Runs the element picker inside the tab's page. A WebContentsView has no
   * <webview> host, so the page bridge reports the choice over IPC instead of
   * resolving the executeJavaScript promise.
   */
  async pickElement(id: string): Promise<PickedElement | null> {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed()) return null;
    const contents = view.webContents;

    return new Promise<PickedElement | null>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (value: PickedElement | null) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        ipcMain.removeListener('orb:page-picked-element', onPicked);
        resolve(value);
      };
      const onPicked = (event: Electron.IpcMainEvent, payload: unknown) => {
        if (event.sender !== contents) return;
        finish(asPickedElement(payload));
      };

      timer = setTimeout(() => finish(null), 65_000);
      ipcMain.on('orb:page-picked-element', onPicked);
      void contents.executeJavaScript(PICK_ELEMENT_SCRIPT, true).catch(() => finish(null));
    });
  }

  /** Applies a Boost's CSS to one tab until the next navigation. */
  async applyCss(id: string, css: string): Promise<void> {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed() || !css.trim()) return;
    try {
      await view.webContents.insertCSS(css);
    } catch {
      // Best effort: a failed Boost only costs styling.
    }
  }

  /** Captures snapshots for the tabs the memory budget is about to reclaim. */
  async applyMemoryBudget(): Promise<string[]> {
    const ids = this.manager.planMemoryBudget();
    await Promise.all(ids.map((id) => this.captureSnapshot(id)));
    for (const id of ids) this.manager.hibernate(id);
    return ids;
  }

  getSnapshot(id: string): string | undefined {
    return this.snapshots.get(id);
  }

  /** Diagnostics for the flagged native path; not used by the UI. */
  debugState(): unknown {
    return {
      bounds: this.manager.getBounds(),
      activeTabId: this.manager.getActiveTabId(),
      pageVisible: this.pageVisible,
      views: [...this.views.entries()].map(([id, view]) => ({
        id,
        visible: view.getVisible(),
        bounds: view.getBounds(),
        url: view.webContents.getURL(),
      })),
    };
  }

  // ------------------------------------------------------------- internals

  private createView(tabId: string, url: string, profileId: string, bounds: ViewBounds): TabView {
    const partition = profilePartition(profileId);
    const session = orbSessionFor(partition, this.ctx);
    initAdBlocker(session);

    const view = new WebContentsView({
      webPreferences: {
        partition,
        preload: path.join(PRELOAD_DIR, 'webview.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
        backgroundThrottling: true,
      },
    });

    this.window.contentView.addChildView(view);
    view.setBounds(bounds);
    this.views.set(tabId, view);

    const contents = view.webContents;
    const emit = (event: TabViewEvent) => this.manager.handleViewEvent(tabId, event);
    const history = () => ({
      canGoBack: contents.navigationHistory.canGoBack(),
      canGoForward: contents.navigationHistory.canGoForward(),
    });

    contents.on('did-start-loading', () => emit({ type: 'did-start-loading' }));
    contents.on('did-stop-loading', () => emit({ type: 'did-stop-loading', ...history() }));
    contents.on('did-navigate', () => emit({ type: 'did-navigate', url: contents.getURL(), ...history() }));
    contents.on('did-navigate-in-page', () => emit({ type: 'did-navigate', url: contents.getURL(), ...history() }));
    contents.on('page-title-updated', (_event, title) => emit({ type: 'page-title-updated', title }));
    contents.on('page-favicon-updated', (_event, favicons) => {
      const favicon = Array.isArray(favicons) ? favicons[0] : '';
      if (favicon) emit({ type: 'page-favicon-updated', favicon });
    });
    contents.on('audio-state-changed', (event) => emit({ type: 'audible-changed', audible: event.audible }));
    contents.on('focus', () => {
      if (!this.window.isDestroyed()) this.window.webContents.send('orb:tab-focused', { tabId });
    });

    return {
      loadURL: (nextUrl) => {
        void contents.loadURL(nextUrl).catch(() => undefined);
      },
      setBounds: (nextBounds) => view.setBounds(nextBounds),
      setVisible: (visible) => view.setVisible(visible),
      focus: () => contents.focus(),
      reload: () => contents.reload(),
      goBack: () => contents.navigationHistory.goBack(),
      goForward: () => contents.navigationHistory.goForward(),
      destroy: () => {
        this.views.delete(tabId);
        if (!this.window.isDestroyed()) this.window.contentView.removeChildView(view);
        if (!contents.isDestroyed()) contents.close();
      },
    };
  }

  private applyVisibility(): void {
    const activeId = this.manager.getActiveTabId();
    for (const [id, view] of this.views) {
      if (view.webContents.isDestroyed()) continue;
      view.setVisible(this.pageVisible && (id === activeId || id === this.split?.id));
    }
  }

  private pushState(snapshot: TabStateSnapshot): void {
    if (this.window.isDestroyed()) return;
    this.window.webContents.send('orb:tabs-state', snapshot);
  }

  private async captureSnapshot(id: string): Promise<void> {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed()) return;
    try {
      const image = await view.webContents.capturePage();
      if (image.isEmpty()) return;
      const dataUrl = image.toDataURL();
      this.snapshots.set(id, dataUrl);
      if (!this.window.isDestroyed()) {
        this.window.webContents.send('orb:tab-snapshot', { tabId: id, dataUrl });
      }
    } catch {
      // Capture is best-effort: a missing snapshot only costs a repaint.
    }
  }

  private destroy(): void {
    if (this.closed) return;
    this.closed = true;
    this.manager.destroy();
    this.views.clear();
    this.snapshots.clear();
  }
}

type HostLookup = (event: IpcMainInvokeEvent) => NativeTabHost | undefined;

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

function requireBounds(value: unknown): ViewBounds {
  if (!value || typeof value !== 'object') throw new Error('Invalid bounds.');
  const bounds = value as Record<string, unknown>;
  return clampBounds({
    x: Number(bounds.x),
    y: Number(bounds.y),
    width: Number(bounds.width),
    height: Number(bounds.height),
  });
}

function asPickedElement(value: unknown): PickedElement | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as Record<string, unknown>;
  const selector = result.selector;
  if (typeof selector !== 'string' || selector.length === 0) return null;
  return {
    selector,
    label: typeof result.label === 'string' ? result.label : selector,
    score: typeof result.score === 'number' ? result.score : 0,
  };
}

function requireSecondaryBounds(value: unknown): { id: string; bounds: ViewBounds } | null {
  if (!value || typeof value !== 'object') return null;
  const secondary = value as Record<string, unknown>;
  return { id: requireString(secondary.id, 'tab id'), bounds: requireBounds(secondary.bounds) };
}

/** Registers the tab intents. Every handler is a no-op for unknown windows. */
export function registerNativeTabHandlers(getHost: HostLookup): void {
  const on = (channel: string, handler: (host: NativeTabHost, ...args: unknown[]) => unknown) => {
    ipcMain.handle(channel, (event, ...args) => {
      const host = getHost(event);
      if (!host) return null;
      return handler(host, ...args);
    });
  };

  on('tabs:open', (host, input) => {
    if (!input || typeof input !== 'object') return null;
    const value = input as Record<string, unknown>;
    host.open({
      id: typeof value.id === 'string' ? value.id : undefined,
      url: requireString(value.url, 'URL'),
      spaceId: typeof value.spaceId === 'string' ? value.spaceId : 'default',
      profileId: typeof value.profileId === 'string' ? value.profileId : 'default',
      isPinned: value.isPinned === true,
      activate: value.activate !== false,
    });
    return host.snapshot();
  });

  on('tabs:activate', (host, id) => host.activate(requireString(id, 'tab id')));
  on('tabs:close', (host, id) => host.close(requireString(id, 'tab id')));
  on('tabs:navigate', (host, id, url) => host.navigate(requireString(id, 'tab id'), requireString(url, 'URL')));
  on('tabs:reload', (host, id) => host.reload(requireString(id, 'tab id')));
  on('tabs:back', (host, id) => host.goBack(requireString(id, 'tab id')));
  on('tabs:forward', (host, id) => host.goForward(requireString(id, 'tab id')));
  on('tabs:reorder', (host, ids) => {
    if (!Array.isArray(ids)) return null;
    host.reorder(ids.filter((id): id is string => typeof id === 'string'));
    return host.snapshot();
  });
  on('tabs:set-bounds', (host, bounds, secondary) => {
    host.setBounds(requireBounds(bounds), requireSecondaryBounds(secondary));
  });
  on('tabs:set-tab-bounds', (host, id, bounds) => host.setTabBounds(requireString(id, 'tab id'), requireBounds(bounds)));
  on('tabs:set-page-visible', (host, visible) => host.setPageVisible(visible === true));
  on('tabs:hibernate', (host, id) => host.hibernate(requireString(id, 'tab id')));
  on('tabs:wake', (host, id) => host.wake(requireString(id, 'tab id')));
  on('tabs:apply-memory-budget', (host) => host.applyMemoryBudget());
  on('tabs:pick-element', (host, id) => host.pickElement(requireString(id, 'tab id')));
  on('tabs:apply-css', (host, id, css) => {
    if (typeof css !== 'string' || css.length > 200_000) throw new Error('Invalid CSS.');
    return host.applyCss(requireString(id, 'tab id'), css);
  });
  on('tabs:snapshot', (host) => host.snapshot());
  on('tabs:get-snapshot', (host, id) => host.getSnapshot(requireString(id, 'tab id')) ?? null);
  on('tabs:debug-state', (host) => host.debugState());
}
