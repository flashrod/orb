import { contextBridge, ipcRenderer } from 'electron';
import { BoostRecord, NewBoost } from '../shared/boosts';
import { isOrbEventChannel } from '../shared/events';
import type { TabOpenInput, TabStateSnapshot, ViewBounds } from '../shared/tabModel';
import type { ZoomDirection } from '../shared/zoom';

// Main -> renderer push events. Only allowlisted channels are subscribable, and
// each subscription gets an id so the renderer can cancel it without needing to
// pass the original callback back across the context bridge.
const eventSubscriptions = new Map<number, { channel: string; handler: (...args: any[]) => void }>();
let nextSubscriptionId = 1;

function subscribeToOrbEvent(channel: string, listener: (payload: unknown) => void): number {
  if (!isOrbEventChannel(channel) || typeof listener !== 'function') return 0;
  const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload);
  const id = nextSubscriptionId++;
  eventSubscriptions.set(id, { channel, handler });
  ipcRenderer.on(channel, handler);
  return id;
}

function unsubscribeFromOrbEvent(subscriptionId: number): void {
  const subscription = eventSubscriptions.get(subscriptionId);
  if (!subscription) return;
  ipcRenderer.removeListener(subscription.channel, subscription.handler);
  eventSubscriptions.delete(subscriptionId);
}

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('orbApi', {
  on: subscribeToOrbEvent,
  off: unsubscribeFromOrbEvent,
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  installExtension: () => ipcRenderer.invoke('extensions:install'),
  removeExtension: (id: string) => ipcRenderer.invoke('extensions:remove', id),
  // Window management
  getWindowById: (webContentsId: number) =>
    ipcRenderer.invoke('window:get-by-id', webContentsId),
  openExternal: (url: string) => ipcRenderer.invoke('window:open-external', url),
  toggleDevTools: () => ipcRenderer.invoke('window:toggle-devtools'),
  minimizeCurrentWindow: () => ipcRenderer.invoke('window:minimize-current'),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen') as Promise<boolean>,
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen') as Promise<boolean>,
  fullscreenDebug: () => ipcRenderer.invoke('window:fullscreen-debug'),
  focusWindow: (webContentsId: number) => ipcRenderer.invoke('window:focus', webContentsId),
  clearProfileData: (profileId: string) => ipcRenderer.invoke('profile:clear-data', profileId),

  // Dialogs
  saveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
  openDialog: (options: any) => ipcRenderer.invoke('dialog:open', options),
  savePdf: (data: Uint8Array, suggestedName: string) => ipcRenderer.invoke('pdf:save', data, suggestedName),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getBuildInfo: () => ipcRenderer.invoke('app:get-build-info'),
  /** Fire-and-forget: lets the benchmark know when the shell is usable. */
  reportShellReady: () => ipcRenderer.send('app:shell-ready'),
  reportRendererError: (payload: { report: string }) => ipcRenderer.invoke('app:report-renderer-error', payload),
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  clearBrowsingData: (request: unknown) => ipcRenderer.invoke('app:clear-browsing-data', request),
  takeLaunchUrl: () => ipcRenderer.invoke('app:take-launch-url') as Promise<string | null>,
  getDefaultBrowserStatus: () => ipcRenderer.invoke('app:default-browser-status'),
  setDefaultBrowser: () => ipcRenderer.invoke('app:set-default-browser'),
  openDefaultBrowserSettings: () => ipcRenderer.invoke('app:open-default-browser-settings'),

  // Ad blocker
  toggleAdBlocker: (enabled: boolean) =>
    ipcRenderer.invoke('adblocker:set-enabled', enabled),
  getAdBlockerStatus: () =>
    ipcRenderer.invoke('adblocker:get-status'),
  addAdBlockerAllowlist: (domain: string) => ipcRenderer.invoke('adblocker:allowlist-add', domain),
  removeAdBlockerAllowlist: (domain: string) => ipcRenderer.invoke('adblocker:allowlist-remove', domain),
  clearBlockedRequestLog: () => ipcRenderer.invoke('adblocker:blocked-log-clear'),
  setFilterListEnabled: (id: string, enabled: boolean) => ipcRenderer.invoke('adblocker:filter-lists-set', id, enabled),
  addFilterList: (url: string, name?: string) => ipcRenderer.invoke('adblocker:filter-lists-add', url, name),
  removeFilterList: (id: string) => ipcRenderer.invoke('adblocker:filter-lists-remove', id),
  refreshFilterLists: () => ipcRenderer.invoke('adblocker:filter-lists-refresh'),
  setThirdPartyCookieBlocking: (enabled: boolean) => ipcRenderer.invoke('adblocker:third-party-cookies-set', enabled),
  setFingerprintingProtection: (enabled: boolean) => ipcRenderer.invoke('adblocker:fingerprinting-set', enabled),
  setWebRtcProtection: (enabled: boolean) => ipcRenderer.invoke('adblocker:webrtc-set', enabled),
  importUblockList: (filePath: string) =>
    ipcRenderer.invoke('adblocker:import-ublock-list', filePath),

  // Tracker blocking
  toggleTrackerBlocking: (enabled: boolean) =>
    ipcRenderer.invoke('adblocker:set-tracker-blocking', enabled),
  getTrackerBlockingStatus: () =>
    ipcRenderer.invoke('adblocker:get-tracker-status'),

  // HTTPS-only
  toggleHttpsOnly: (enabled: boolean) =>
    ipcRenderer.invoke('adblocker:set-https-only', enabled),
  getHttpsOnlyStatus: () =>
    ipcRenderer.invoke('adblocker:get-https-status'),
  addHttpsException: (domain: string) =>
    ipcRenderer.invoke('adblocker:https-exception-add', domain),
  removeHttpsException: (domain: string) =>
    ipcRenderer.invoke('adblocker:https-exception-remove', domain),

  // Boosts
  getBoosts: () => ipcRenderer.invoke('boosts:get-all'),
  saveBoost: (boost: NewBoost) => ipcRenderer.invoke('boosts:save', boost) as Promise<BoostRecord>,
  deleteBoost: (id: string) => ipcRenderer.invoke('boosts:delete', id),

  // Permissions
  permissionRespond: (id: string, allowed: boolean) => ipcRenderer.invoke('permission:respond', { id, allowed }),
  getPermissions: () => ipcRenderer.invoke('permission:get-all'),
  setPermission: (host: string, permission: string, state: string) => ipcRenderer.invoke('permission:set', { host, permission, state }),
  removePermission: (host: string, permission: string) => ipcRenderer.invoke('permission:remove', { host, permission }),

  // History
  queryHistory: (text: string, limit?: number) => ipcRenderer.invoke('history:query', text, limit ?? 20),
  topSites: (limit?: number) => ipcRenderer.invoke('history:top', limit ?? 8),
  recentSites: (limit?: number) => ipcRenderer.invoke('history:recent', limit ?? 6),
  removeHistory: (url: string) => ipcRenderer.invoke('history:remove', url),
  removeHistoryHost: (host: string) => ipcRenderer.invoke('history:remove-host', host),
  clearHistoryRange: (from: number, to: number) => ipcRenderer.invoke('history:clear-range', from, to),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Downloads
  getDownloads: () => ipcRenderer.invoke('downloads:get-all'),
  cancelDownload: (id: string) => ipcRenderer.invoke('downloads:cancel', id),
  removeDownload: (id: string) => ipcRenderer.invoke('downloads:remove', id),
  clearCompletedDownloads: () => ipcRenderer.invoke('downloads:clear-completed'),
  setDownloadPath: (p: string) => ipcRenderer.invoke('downloads:set-path', p),
  getDownloadPath: () => ipcRenderer.invoke('downloads:get-path'),

  // Native tab views (main-process WebContentsView engine)
  tabs: {
    open: (input: TabOpenInput) => ipcRenderer.invoke('tabs:open', input) as Promise<TabStateSnapshot | null>,
    activate: (id: string) => ipcRenderer.invoke('tabs:activate', id) as Promise<void>,
    close: (id: string) => ipcRenderer.invoke('tabs:close', id) as Promise<void>,
    navigate: (id: string, url: string) => ipcRenderer.invoke('tabs:navigate', id, url) as Promise<void>,
    reload: (id: string, ignoreCache = false) => ipcRenderer.invoke('tabs:reload', id, ignoreCache) as Promise<void>,
    zoom: (id: string, direction: ZoomDirection) => ipcRenderer.invoke('tabs:zoom', id, direction) as Promise<void>,
    back: (id: string) => ipcRenderer.invoke('tabs:back', id) as Promise<void>,
    forward: (id: string) => ipcRenderer.invoke('tabs:forward', id) as Promise<void>,
    reorder: (ids: string[]) => ipcRenderer.invoke('tabs:reorder', ids) as Promise<TabStateSnapshot | null>,
    setBounds: (bounds: ViewBounds, secondary?: { id: string; bounds: ViewBounds } | null) => ipcRenderer.invoke('tabs:set-bounds', bounds, secondary ?? null) as Promise<void>,
    setTabBounds: (id: string, bounds: ViewBounds) => ipcRenderer.invoke('tabs:set-tab-bounds', id, bounds) as Promise<void>,
    setMuted: (id: string, muted: boolean) => ipcRenderer.invoke('tabs:set-muted', id, muted) as Promise<void>,
    setPageVisible: (visible: boolean) => ipcRenderer.invoke('tabs:set-page-visible', visible) as Promise<void>,
    hibernate: (id: string) => ipcRenderer.invoke('tabs:hibernate', id) as Promise<void>,
    wake: (id: string) => ipcRenderer.invoke('tabs:wake', id) as Promise<void>,
    applyMemoryBudget: () => ipcRenderer.invoke('tabs:apply-memory-budget') as Promise<string[]>,
    pickElement: (id: string) => ipcRenderer.invoke('tabs:pick-element', id) as Promise<{ selector: string; label: string; score: number } | null>,
    findInPage: (id: string, text: string, options?: { forward?: boolean; findNext?: boolean }) => ipcRenderer.invoke('tabs:find-in-page', id, text, options ?? {}) as Promise<void>,
    print: (id: string) => ipcRenderer.invoke('tabs:print', id) as Promise<void>,
    printToPDF: (id: string) => ipcRenderer.invoke('tabs:print-to-pdf', id) as Promise<Uint8Array | null>,
    togglePictureInPicture: (id: string) => ipcRenderer.invoke('tabs:toggle-picture-in-picture', id) as Promise<{ ok: boolean; active?: boolean; error?: string }>,
    toggleMediaPlayback: (id: string) => ipcRenderer.invoke('tabs:toggle-media-playback', id) as Promise<{ ok: boolean; playing?: boolean; error?: string }>,
    executeBoostJavaScript: (id: string, code: string) => ipcRenderer.invoke('tabs:execute-boost-javascript', id, code) as Promise<void>,
    memory: () => ipcRenderer.invoke('tabs:memory') as Promise<{ id: string; pid: number | null; bytes: number }[]>,
    hibernateBackground: () => ipcRenderer.invoke('tabs:hibernate-background') as Promise<string[]>,
    setNeverHibernate: (domains: string[]) => ipcRenderer.invoke('tabs:set-never-hibernate', domains) as Promise<void>,
    stopFindInPage: (id: string, action?: 'clearSelection' | 'keepSelection' | 'activateSelection') => ipcRenderer.invoke('tabs:stop-find-in-page', id, action ?? 'clearSelection') as Promise<void>,
    applyCss: (id: string, css: string) => ipcRenderer.invoke('tabs:apply-css', id, css) as Promise<void>,
    snapshot: () => ipcRenderer.invoke('tabs:snapshot') as Promise<TabStateSnapshot>,
    getSnapshot: (id: string) => ipcRenderer.invoke('tabs:get-snapshot', id) as Promise<string | null>,
    debugState: () => ipcRenderer.invoke('tabs:debug-state') as Promise<unknown>,
  },
  keymap: {
    getOverrides: () => ipcRenderer.invoke('keymap:get-overrides'),
    setOverride: (commandId: string, bindings: string[] | null) =>
      ipcRenderer.invoke('keymap:set-override', commandId, bindings),
    setOverrides: (overrides: Record<string, string[] | null>) =>
      ipcRenderer.invoke('keymap:set-overrides', overrides),
  },
  passthrough: {
    getRules: () => ipcRenderer.invoke('keymap:get-passthrough-rules'),
    setRule: (domain: string, commandIds: string[]) =>
      ipcRenderer.invoke('keymap:set-passthrough-rule', domain, commandIds),
    setRules: (rules: Record<string, string[]>) =>
      ipcRenderer.invoke('keymap:set-passthrough-rules', rules),
  },
});

declare global {
  interface Window {
    orbApi: {
      listExtensions: () => Promise<{ id: string; name: string; version: string }[]>;
      installExtension: () => Promise<{ id: string; name: string; version: string } | null>;
      removeExtension: (id: string) => Promise<{ removed: boolean }>;
      getWindowById: (webContentsId: number) => Promise<any>;
      openExternal: (url: string) => Promise<void>;
      toggleDevTools: () => Promise<void>;
      minimizeCurrentWindow: () => Promise<void>;
      isFullscreen: () => Promise<boolean>;
      toggleFullscreen: () => Promise<boolean>;
      fullscreenDebug: () => Promise<{ full: boolean; simple: boolean; bounds: { x: number; y: number; width: number; height: number }; content: { x: number; y: number; width: number; height: number }; display: { x: number; y: number; width: number; height: number }; workArea: { x: number; y: number; width: number; height: number } } | null>;
      focusWindow: (webContentsId: number) => Promise<void>;
      clearProfileData: (profileId: string) => Promise<{ cleared: boolean }>;
      saveDialog: (options: any) => Promise<any>;
      openDialog: (options: any) => Promise<any>;
      savePdf: (data: Uint8Array, suggestedName: string) => Promise<{ saved: boolean; path?: string; error?: string }>;
      getAppVersion: () => Promise<string>;
      getBuildInfo: () => Promise<{ version: string; electron: string; chromium: string; node: string; platform: string; arch: string }>;
      reportShellReady: () => void;
      reportRendererError: (payload: { report: string }) => Promise<{ saved: boolean }>;
      checkForUpdates: () => Promise<{ status: 'update-available' | 'up-to-date' | 'error'; currentVersion: string; latestVersion: string | null; url: string | null; notes: string | null; error?: string }>;
      clearBrowsingData: (request: { history?: boolean; cache?: boolean; cookies?: boolean; siteData?: boolean }) => Promise<{ ok: boolean; labels: string[]; profiles?: number; error?: string }>;
      takeLaunchUrl: () => Promise<string | null>;
      getDefaultBrowserStatus: () => Promise<{ isDefault: boolean; platform: string }>;
      setDefaultBrowser: () => Promise<{ isDefault: boolean; platform: string }>;
      openDefaultBrowserSettings: () => Promise<{ opened: boolean }>;
      toggleAdBlocker: (enabled: boolean) => Promise<void>;
      getAdBlockerStatus: () => Promise<any>;
      toggleTrackerBlocking: (enabled: boolean) => Promise<{ trackerBlockingEnabled: boolean; trackerRuleCount: number }>;
      getTrackerBlockingStatus: () => Promise<{ trackerBlockingEnabled: boolean; trackerRuleCount: number }>;
      toggleHttpsOnly: (enabled: boolean) => Promise<{ httpsOnlyEnabled: boolean }>;
      getHttpsOnlyStatus: () => Promise<{ httpsOnlyEnabled: boolean; httpsExceptions: string[] }>;
      addHttpsException: (domain: string) => Promise<string[]>;
      removeHttpsException: (domain: string) => Promise<string[]>;
      addAdBlockerAllowlist: (domain: string) => Promise<string[]>;
      removeAdBlockerAllowlist: (domain: string) => Promise<string[]>;
      clearBlockedRequestLog: () => Promise<{ cleared: boolean }>;
      setFilterListEnabled: (id: string, enabled: boolean) => Promise<any[]>;
      addFilterList: (url: string, name?: string) => Promise<any[]>;
      removeFilterList: (id: string) => Promise<any[]>;
      refreshFilterLists: () => Promise<any[]>;
      setThirdPartyCookieBlocking: (enabled: boolean) => Promise<{ enabled: boolean }>;
      setFingerprintingProtection: (enabled: boolean) => Promise<{ enabled: boolean }>;
      setWebRtcProtection: (enabled: boolean) => Promise<{ enabled: boolean }>;
      importUblockList: (filePath: string) => Promise<any>;
      getBoosts: () => Promise<BoostRecord[]>;
      saveBoost: (boost: NewBoost) => Promise<BoostRecord>;
      deleteBoost: (id: string) => Promise<{ deleted: boolean }>;
      // Permissions
      permissionRespond: (id: string, allowed: boolean) => Promise<void>;
      getPermissions: () => Promise<Array<{ host: string; permission: string; state: string; updatedAt: number }>>;
      setPermission: (host: string, permission: string, state: string) => Promise<{ ok: boolean }>;
      removePermission: (host: string, permission: string) => Promise<{ ok: boolean }>;
      // History
      queryHistory: (text: string, limit?: number) => Promise<Array<{ url: string; title: string; host: string; visitedAt: number; visitCount: number }>>;
      topSites: (limit?: number) => Promise<Array<{ url: string; title: string; host: string; visitedAt: number; visitCount: number }>>;
      recentSites: (limit?: number) => Promise<Array<{ url: string; title: string; host: string; visitedAt: number; visitCount: number }>>;
      removeHistory: (url: string) => Promise<{ ok: boolean }>;
      removeHistoryHost: (host: string) => Promise<{ ok: boolean; removed: number }>;
      clearHistoryRange: (from: number, to: number) => Promise<{ ok: boolean; removed: number }>;
      clearHistory: () => Promise<{ ok: boolean }>;
      // Downloads
      getDownloads: () => Promise<Array<{ id: string; url: string; filePath: string | null; totalBytes: number; receivedBytes: number; state: string; startedAt: number; completedAt: number | null }>>;
      cancelDownload: (id: string) => Promise<{ ok: boolean }>;
      removeDownload: (id: string) => Promise<{ ok: boolean }>;
      clearCompletedDownloads: () => Promise<{ ok: boolean }>;
      setDownloadPath: (p: string) => Promise<{ ok: boolean; path: string }>;
      getDownloadPath: () => Promise<string>;
      tabs: {
        open: (input: TabOpenInput) => Promise<TabStateSnapshot | null>;
        activate: (id: string) => Promise<void>;
        close: (id: string) => Promise<void>;
        navigate: (id: string, url: string) => Promise<void>;
        reload: (id: string, ignoreCache?: boolean) => Promise<void>;
        zoom: (id: string, direction: ZoomDirection) => Promise<void>;
        back: (id: string) => Promise<void>;
        forward: (id: string) => Promise<void>;
        reorder: (ids: string[]) => Promise<TabStateSnapshot | null>;
        setBounds: (bounds: ViewBounds, secondary?: { id: string; bounds: ViewBounds } | null) => Promise<void>;
        setTabBounds: (id: string, bounds: ViewBounds) => Promise<void>;
        setMuted: (id: string, muted: boolean) => Promise<void>;
        setPageVisible: (visible: boolean) => Promise<void>;
        hibernate: (id: string) => Promise<void>;
        wake: (id: string) => Promise<void>;
        applyMemoryBudget: () => Promise<string[]>;
        pickElement: (id: string) => Promise<{ selector: string; label: string; score: number } | null>;
        findInPage: (id: string, text: string, options?: { forward?: boolean; findNext?: boolean }) => Promise<void>;
        print: (id: string) => Promise<void>;
        printToPDF: (id: string) => Promise<Uint8Array | null>;
        togglePictureInPicture: (id: string) => Promise<{ ok: boolean; active?: boolean; error?: string }>;
        toggleMediaPlayback: (id: string) => Promise<{ ok: boolean; playing?: boolean; error?: string }>;
        executeBoostJavaScript: (id: string, code: string) => Promise<void>;
        memory: () => Promise<{ id: string; pid: number | null; bytes: number }[]>;
        hibernateBackground: () => Promise<string[]>;
        setNeverHibernate: (domains: string[]) => Promise<void>;
        stopFindInPage: (id: string, action?: 'clearSelection' | 'keepSelection' | 'activateSelection') => Promise<void>;
        applyCss: (id: string, css: string) => Promise<void>;
        snapshot: () => Promise<TabStateSnapshot>;
        getSnapshot: (id: string) => Promise<string | null>;
        debugState: () => Promise<unknown>;
      },
      // Keymap overrides synced to the main process so key events inside web
      // pages can be matched without a round trip.
      keymap: {
        getOverrides: () => Promise<Record<string, string[] | null>>;
        setOverride: (commandId: string, bindings: string[] | null) => Promise<void>;
        setOverrides: (overrides: Record<string, string[] | null>) => Promise<void>;
      },
      // Per-site shortcut passthrough rules synced to the main process.
      passthrough: {
        getRules: () => Promise<Record<string, string[]>>;
        setRule: (domain: string, commandIds: string[]) => Promise<void>;
        setRules: (rules: Record<string, string[]>) => Promise<void>;
      };
      // Main -> renderer events (allowlisted channels only)
      on: (channel: string, listener: (payload: unknown) => void) => number;
      off: (subscriptionId: number) => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    };
  }
}
