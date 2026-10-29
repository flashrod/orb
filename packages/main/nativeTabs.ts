import path from 'node:path';
import { BrowserWindow, Menu, WebContentsView, app, clipboard, ipcMain, type WebContents } from 'electron';
import { TabManager, type TabView, type TabViewEvent } from './tabManager';
import { orbSessionFor, type SessionContext } from './sessions';
import { profilePartition } from '../shared/profiles';
import { bestBoostForDomain } from '../shared/boosts';
import { getBoostsDatabase } from './boostsDatabase';
import { clampBounds, type TabOpenInput, type TabStateSnapshot, type ViewBounds } from '../shared/tabModel';
import { adBlocker, initAdBlocker } from './adBlocker';
import { PrewarmPool } from './prewarmPool';
import { buildPageContextMenu } from './pageContextMenu';
import { stripTrackingParams } from '../shared/privacy';
import type { ZoomDirection } from '../shared/zoom';
import { hostFromUrl } from '../shared/sessionPolicy';
import type { TabMemorySample } from '../shared/memory';
import { PICK_ELEMENT_SCRIPT, type PickedElement } from '../shared/elementPicker';
import {
  canUsePictureInPicture,
  TOGGLE_MEDIA_PLAYBACK_SCRIPT,
  TOGGLE_PIP_SCRIPT,
  type MediaActionResult,
} from '../shared/media';

const PRELOAD_DIR = path.join(__dirname, 'preload');

type PrewarmedView = {
  view: WebContentsView;
  destroy: () => void;
};

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
  private readonly scrollPositions = new Map<string, number>();
  private readonly insertedCssKeys = new Map<string, string[]>();
  private readonly appliedBoosts = new Map<string, string>();
  private readonly prewarm: PrewarmPool<PrewarmedView>;
  private neverHibernate: string[] = [];
  private split: { id: string; bounds: ViewBounds } | null = null;
  private pageVisible = true;
  private desiredPageVisible = true;
  private closed = false;
  private readonly crashedTabs = new Set<string>();

  constructor(window: BrowserWindow, ctx: SessionContext) {
    this.window = window;
    this.ctx = ctx;
    this.manager = new TabManager({
      createView: (tab, bounds) => this.createView(tab.id, tab.url, tab.profileId, bounds),
      onStateChange: (snapshot) => {
        this.applyVisibility();
        this.pushState(snapshot);
      },
      neverHibernate: () => this.neverHibernate,
    });

    this.prewarm = new PrewarmPool<PrewarmedView>(
      (profileId) => this.makeView(profileId),
      { schedule: (task) => setTimeout(task, 25) },
    );
    // Warm the default profile after the window has painted so startup is not
    // competing with a hidden view.
    setTimeout(() => this.prewarm.warm('default'), 0);

    window.on('closed', () => this.destroy());
  }

  // ------------------------------------------------------------- intents

  open(input: TabOpenInput): void {
    this.manager.open(input);
  }

  activate(id: string): void {
    const previous = this.manager.getActiveTabId();
    // Capture while the outgoing tab is still visible; hidden views paint
    // nothing, so this is the only reliable moment for a wake frame.
    if (previous && previous !== id) void this.captureSnapshot(previous);
    this.sendWakeSnapshot(id);
    this.manager.activate(id);
  }

  close(id: string): void {
    if (this.split?.id === id) this.split = null;
    this.manager.close(id);
    this.snapshots.delete(id);
    this.scrollPositions.delete(id);
  }

  navigate(id: string, url: string): void {
    this.manager.navigate(id, url);
  }

  reload(id: string, ignoreCache = false): void {
    this.manager.reload(id, ignoreCache);
  }

  zoom(id: string, direction: ZoomDirection): void {
    this.manager.zoom(id, direction);
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

  /** Mutes or unmutes one tab; the renderer owns site-wide mute memory. */
  setMuted(id: string, muted: boolean): void {
    this.manager.setMuted(id, muted);
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

  /** Replaces the user's never-hibernate list for this window. */
  setNeverHibernate(domains: readonly string[]): void {
    this.neverHibernate = domains.map((domain) => domain.trim()).filter(Boolean);
  }

  snapshot(): TabStateSnapshot {
    return this.manager.snapshot();
  }

  async hibernate(id: string): Promise<void> {
    const view = this.views.get(id);
    if (view && !view.webContents.isDestroyed()) {
      const scrollY = await view.webContents.executeJavaScript('window.scrollY').catch(() => 0);
      if (typeof scrollY === 'number' && scrollY > 0) this.scrollPositions.set(id, scrollY);
    }
    await this.captureSnapshot(id);
    if (this.split?.id === id) this.split = null;
    this.manager.hibernate(id);
  }

  wake(id: string): void {
    this.sendWakeSnapshot(id);
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

  /** Per-tab renderer memory, for the performance panel. */
  memory(): TabMemorySample[] {
    const metrics = new Map(app.getAppMetrics().map((metric) => [metric.pid, metric.memory.workingSetSize * 1024]));
    return [...this.views.entries()].map(([id, view]) => {
      const pid = view.webContents.isDestroyed() ? null : view.webContents.getOSProcessId();
      return { id, pid, bytes: pid ? metrics.get(pid) ?? 0 : 0 };
    });
  }

  print(id: string): void {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed()) return;
    view.webContents.print({ printBackground: true });
  }

  /** Renders a tab to PDF data for the save dialog. */
  async printToPDF(id: string): Promise<Uint8Array | null> {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed()) return null;
    const pdf = await view.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    });
    return new Uint8Array(pdf);
  }

  async togglePictureInPicture(id: string): Promise<MediaActionResult> {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed()) return { ok: false, error: 'This tab is not loaded.' };
    if (!canUsePictureInPicture(view.webContents.getURL())) {
      return { ok: false, error: 'Picture-in-picture is disabled for this site.' };
    }
    const result = await view.webContents.executeJavaScript(TOGGLE_PIP_SCRIPT, true);
    return result ?? { ok: false, error: 'The page did not respond.' };
  }

  async toggleMediaPlayback(id: string): Promise<MediaActionResult> {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed()) return { ok: false, error: 'This tab is not loaded.' };
    const result = await view.webContents.executeJavaScript(TOGGLE_MEDIA_PLAYBACK_SCRIPT, true);
    return result ?? { ok: false, error: 'The page did not respond.' };
  }

  /** Runs a Boost's JavaScript in a tab for the live editor preview. */
  async executeBoostJavaScript(id: string, code: string): Promise<void> {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed() || !code.trim()) return;
    await view.webContents.executeJavaScript(code, true);
  }

  /** Records whether a page holds typed input a reload would discard. */
  noteUnsavedInput(sender: WebContents, hasUnsavedInput: boolean): void {
    for (const [tabId, view] of this.views) {
      if (view.webContents === sender) {
        this.manager.handleViewEvent(tabId, { type: 'unsaved-input-changed', hasUnsavedInput });
        return;
      }
    }
  }

  /** Hibernates every background tab that is safe to reclaim. */
  hibernateBackground(): string[] {
    const ids = this.manager.planMemoryBudget({ idleThresholdMs: 0, maxLiveTabs: Number.MAX_SAFE_INTEGER });
    for (const id of ids) void this.hibernate(id);
    return ids;
  }

  findInPage(id: string, text: string, options: { forward?: boolean; findNext?: boolean } = {}): void {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed() || !text) return;
    view.webContents.findInPage(text, {
      forward: options.forward !== false,
      findNext: options.findNext === true,
    });
  }

  stopFindInPage(id: string, action: 'clearSelection' | 'keepSelection' | 'activateSelection' = 'clearSelection'): void {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed()) return;
    view.webContents.stopFindInPage(action);
  }

  /** Applies a Boost's CSS to one tab until the next full navigation. */
  async applyCss(id: string, css: string): Promise<void> {
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed() || !css.trim()) return;
    try {
      const key = await view.webContents.insertCSS(css);
      const keys = this.insertedCssKeys.get(id) ?? [];
      keys.push(key);
      this.insertedCssKeys.set(id, keys);
    } catch {
      // Best effort: a failed Boost only costs styling.
    }
  }

  private async clearInsertedCss(id: string): Promise<void> {
    const keys = this.insertedCssKeys.get(id) ?? [];
    this.insertedCssKeys.delete(id);
    const view = this.views.get(id);
    if (!view || view.webContents.isDestroyed()) return;
    await Promise.all(keys.map((key) => view.webContents.removeInsertedCSS(key).catch(() => undefined)));
  }

  /** Applies the active Boost for the page that just finished loading. */
  private async applyBoost(tabId: string, contents: WebContents): Promise<void> {
    if (contents.isDestroyed()) return;
    let host = '';
    try {
      host = new URL(contents.getURL()).hostname;
    } catch {
      return;
    }
    if (!host) return;

    try {
      const boosts = (await getBoostsDatabase()).getAll().filter((boost) => boost.enabled);
      const boost = bestBoostForDomain(boosts, host);
      if (!boost) return;

      const appliedKey = `${contents.getURL()}|${boost.id}|${boost.updatedAt}`;
      if (this.appliedBoosts.get(tabId) === appliedKey) return;
      this.appliedBoosts.set(tabId, appliedKey);

      if (boost.css.trim()) {
        const key = await contents.insertCSS(boost.css);
        const keys = this.insertedCssKeys.get(tabId) ?? [];
        keys.push(key);
        this.insertedCssKeys.set(tabId, keys);
      }
      if (boost.js.trim()) await contents.executeJavaScript(boost.js, true);
    } catch {
      // A broken Boost should never block the page itself.
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
      snapshots: [...this.snapshots.keys()],
      views: [...this.views.entries()].map(([id, view]) => ({
        id,
        visible: view.getVisible(),
        bounds: view.getBounds(),
        url: view.webContents.getURL(),
      })),
    };
  }

  // ------------------------------------------------------------- internals

  /** Builds a hidden view; the pool keeps one ready per profile. */
  private makeView(profileId: string): PrewarmedView {
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
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    view.setVisible(false);

    return {
      view,
      destroy: () => {
        if (!this.window.isDestroyed()) this.window.contentView.removeChildView(view);
        if (!view.webContents.isDestroyed()) view.webContents.close();
      },
    };
  }

  private createView(tabId: string, url: string, profileId: string, bounds: ViewBounds): TabView {
    const warmed = this.prewarm.take(profileId);
    const view = (warmed ?? this.makeView(profileId)).view;
    view.setBounds(bounds);
    this.views.set(tabId, view);
    if (!warmed) setTimeout(() => this.prewarm.warm(profileId), 25);

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
    contents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) {
        this.appliedBoosts.delete(tabId);
        void this.clearInsertedCss(tabId);
      }
    });
    contents.on('dom-ready', () => {
      void this.applyBoost(tabId, contents);
      const host = hostFromUrl(contents.getURL());
      if (host) void this.applyCss(tabId, adBlocker.getCosmeticCss(host));
    });
    contents.on('page-title-updated', (_event, title) => emit({ type: 'page-title-updated', title }));
    contents.on('page-favicon-updated', (_event, favicons) => {
      const favicon = Array.isArray(favicons) ? favicons[0] : '';
      if (favicon) emit({ type: 'page-favicon-updated', favicon });
    });
    // Behavior-based hibernation protection. A call is inferred from an allowed
    // microphone plus live audio, which covers every conferencing site without
    // naming one; notifications follow the permission the user already granted.
    const refreshProtection = () => {
      if (contents.isDestroyed()) return;
      const host = hostFromUrl(contents.getURL());
      if (!host) return;
      emit({
        type: 'notification-permission-changed',
        granted: this.ctx.permissionStore.get(host, 'notifications') === 'allow',
      });
      emit({
        type: 'call-state-changed',
        inCall: this.ctx.permissionStore.get(host, 'microphone') === 'allow' && contents.isCurrentlyAudible(),
      });
    };
    contents.on('did-stop-loading', refreshProtection);
    contents.on('did-navigate-in-page', refreshProtection);
    contents.on('audio-state-changed', (event) => {
      emit({ type: 'audible-changed', audible: event.audible });
      refreshProtection();
    });
    contents.on('focus', () => {
      if (!this.window.isDestroyed()) this.window.webContents.send('orb:tab-focused', { tabId });
    });
    contents.on('will-navigate', (event, url) => {
      const cleaned = stripTrackingParams(url);
      if (cleaned === url) return;
      event.preventDefault();
      void contents.loadURL(cleaned);
    });
    contents.on('context-menu', (_event, params) => {
      if (this.window.isDestroyed()) return;
      const template = buildPageContextMenu(params, {
        openInNewTab: (url) => this.window.webContents.send('orb:popup-requested', { url }),
        copyText: (text) => clipboard.writeText(text),
        saveImage: (url) => contents.downloadURL(url),
        goBack: () => contents.navigationHistory.goBack(),
        goForward: () => contents.navigationHistory.goForward(),
        reload: () => contents.reload(),
        inspect: () => contents.inspectElement(params.x, params.y),
        canGoBack: contents.navigationHistory.canGoBack(),
        canGoForward: contents.navigationHistory.canGoForward(),
      });
      Menu.buildFromTemplate(template).popup({ window: this.window });
    });
    const restoreScroll = this.scrollPositions.get(tabId);
    if (restoreScroll) {
      this.scrollPositions.delete(tabId);
      contents.once('did-finish-load', () => {
        const y = Math.max(0, Math.floor(restoreScroll));
        void contents.executeJavaScript(`window.scrollTo(0, ${y})`).catch(() => undefined);
      });
    }
    contents.on('found-in-page', (_event, result) => {
      if (this.window.isDestroyed()) return;
      this.window.webContents.send('orb:find-result', {
        tabId,
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
      });
    });

    // Renderer process died: tell the shell so it can show an in-tab crash
    // page. Track the crash time so auto-reload is rate-limited.
    contents.on('render-process-gone', (_event, details) => {
      if (details?.reason === 'killed' || details?.reason === 'clean-exit') return;
      const reason = (details as { reason?: string }).reason ?? 'unknown';
      this.crashedTabs.add(tabId);
      this.window.webContents.send('orb:tab-crashed', { tabId, reason, crashTime: Date.now() });
    });

    // If a previously crashed tab finishes loading, tell the shell to clear
    // the crash page.
    contents.on('did-finish-load', () => {
      if (this.crashedTabs.delete(tabId)) {
        this.window.webContents.send('orb:tab-recovered', { tabId });
      }
    });

    return {
      loadURL: (nextUrl) => {
        void contents.loadURL(nextUrl).catch(() => undefined);
      },
      setBounds: (nextBounds) => view.setBounds(nextBounds),
      setVisible: (visible) => view.setVisible(visible),
      focus: () => contents.focus(),
      reload: () => contents.reload(),
      reloadIgnoringCache: () => contents.reloadIgnoringCache(),
      getZoomFactor: () => contents.getZoomFactor(),
      setZoomFactor: (factor) => contents.setZoomFactor(factor),
      goBack: () => contents.navigationHistory.goBack(),
      goForward: () => contents.navigationHistory.goForward(),
      setAudioMuted: (muted) => contents.setAudioMuted(muted),
      destroy: () => {
        this.views.delete(tabId);
        this.insertedCssKeys.delete(tabId);
        this.appliedBoosts.delete(tabId);
        if (!this.window.isDestroyed()) this.window.contentView.removeChildView(view);
        if (!contents.isDestroyed()) contents.close();
      },
    };
  }

  /** Replays the last frame while a hibernated tab spins its view back up. */
  private sendWakeSnapshot(id: string): void {
    const tab = this.manager.snapshot().tabs.find((candidate) => candidate.id === id);
    if (!tab || tab.lifecycle !== 'hibernated') return;
    const dataUrl = this.snapshots.get(id);
    if (!dataUrl || this.window.isDestroyed()) return;
    this.window.webContents.send('orb:tab-snapshot', { tabId: id, dataUrl });
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
    this.prewarm.destroy();
    this.manager.destroy();
    this.views.clear();
    this.snapshots.clear();
    this.scrollPositions.clear();
  }
}

type HostLookup = (event: { sender: WebContents }) => NativeTabHost | undefined;

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
  const candidates = Array.isArray(result.candidates)
    ? result.candidates
        .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate) && typeof candidate === 'object')
        .map((candidate) => ({
          selector: typeof candidate.selector === 'string' ? candidate.selector : '',
          score: typeof candidate.score === 'number' ? candidate.score : 0,
        }))
        .filter((candidate) => candidate.selector.length > 0)
        .slice(0, 5)
    : [];
  return {
    selector,
    label: typeof result.label === 'string' ? result.label : selector,
    score: typeof result.score === 'number' ? result.score : 0,
    ...(candidates.length ? { candidates } : {}),
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
  on('tabs:reload', (host, id, ignoreCache) => host.reload(requireString(id, 'tab id'), ignoreCache === true));
  on('tabs:zoom', (host, id, direction) => {
    if (direction !== 'in' && direction !== 'out' && direction !== 'reset') throw new Error('Invalid zoom direction.');
    host.zoom(requireString(id, 'tab id'), direction);
  });
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
  on('tabs:set-muted', (host, id, muted) => host.setMuted(requireString(id, 'tab id'), muted === true));
  on('tabs:set-page-visible', (host, visible) => host.setPageVisible(visible === true));
  on('tabs:hibernate', (host, id) => host.hibernate(requireString(id, 'tab id')));
  on('tabs:wake', (host, id) => host.wake(requireString(id, 'tab id')));
  on('tabs:apply-memory-budget', (host) => host.applyMemoryBudget());
  on('tabs:pick-element', (host, id) => host.pickElement(requireString(id, 'tab id')));
  on('tabs:print', (host, id) => host.print(requireString(id, 'tab id')));
  on('tabs:print-to-pdf', (host, id) => host.printToPDF(requireString(id, 'tab id')));
  on('tabs:toggle-picture-in-picture', (host, id) => host.togglePictureInPicture(requireString(id, 'tab id')));
  on('tabs:toggle-media-playback', (host, id) => host.toggleMediaPlayback(requireString(id, 'tab id')));
  on('tabs:execute-boost-javascript', (host, id, code) => {
    if (typeof code !== 'string' || code.length > 1_000_000) throw new Error('Invalid Boost JavaScript.');
    return host.executeBoostJavaScript(requireString(id, 'tab id'), code);
  });
  on('tabs:memory', (host) => host.memory());
  on('tabs:hibernate-background', (host) => host.hibernateBackground());
  on('tabs:set-never-hibernate', (host, domains) => {
    if (!Array.isArray(domains)) return null;
    host.setNeverHibernate(domains.filter((domain): domain is string => typeof domain === 'string').slice(0, 200));
    return null;
  });
  on('tabs:find-in-page', (host, id, text, options) => {
    if (typeof text !== 'string' || text.length === 0 || text.length > 512) return null;
    const opts = options && typeof options === 'object' ? options as Record<string, unknown> : {};
    host.findInPage(requireString(id, 'tab id'), text, {
      forward: opts.forward !== false,
      findNext: opts.findNext === true,
    });
    return null;
  });
  on('tabs:stop-find-in-page', (host, id, action) => {
    const actions = ['clearSelection', 'keepSelection', 'activateSelection'] as const;
    const value = typeof action === 'string' && (actions as readonly string[]).includes(action)
      ? action as (typeof actions)[number]
      : 'clearSelection';
    host.stopFindInPage(requireString(id, 'tab id'), value);
    return null;
  });
  on('tabs:apply-css', (host, id, css) => {
    if (typeof css !== 'string' || css.length > 200_000) throw new Error('Invalid CSS.');
    return host.applyCss(requireString(id, 'tab id'), css);
  });
  on('tabs:snapshot', (host) => host.snapshot());
  on('tabs:get-snapshot', (host, id) => host.getSnapshot(requireString(id, 'tab id')) ?? null);
  on('tabs:debug-state', (host) => host.debugState());

  // Page content reports dirty form state; there is no invoke response.
  ipcMain.on('orb:page-unsaved-input', (event, dirty) => {
    const host = getHost(event);
    if (!host) return;
    if (typeof dirty !== 'boolean') return;
    host.noteUnsavedInput(event.sender, dirty === true);
  });
}
