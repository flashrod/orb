import { contextBridge, ipcRenderer } from 'electron';
import { BoostRecord, NewBoost } from '../shared/boosts';
import { isOrbEventChannel } from '../shared/events';

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
  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  installExtension: () => ipcRenderer.invoke('extensions:install'),
  removeExtension: (id: string) => ipcRenderer.invoke('extensions:remove', id),
  // Window management
  getWindowById: (webContentsId: number) =>
    ipcRenderer.invoke('window:get-by-id', webContentsId),
  openExternal: (url: string) => ipcRenderer.invoke('window:open-external', url),
  toggleDevTools: () => ipcRenderer.invoke('window:toggle-devtools'),
  minimizeCurrentWindow: () => ipcRenderer.invoke('window:minimize-current'),
  focusWindow: (webContentsId: number) => ipcRenderer.invoke('window:focus', webContentsId),
  clearProfileData: (profileId: string) => ipcRenderer.invoke('profile:clear-data', profileId),

  // Dialogs
  saveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
  openDialog: (options: any) => ipcRenderer.invoke('dialog:open', options),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

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

  // Boosts
  getBoosts: () => ipcRenderer.invoke('boosts:get-all'),
  saveBoost: (boost: NewBoost) => ipcRenderer.invoke('boosts:save', boost) as Promise<BoostRecord>,
  deleteBoost: (id: string) => ipcRenderer.invoke('boosts:delete', id),

  // Permissions
  permissionRespond: (id: string, allowed: boolean) => ipcRenderer.invoke('permission:respond', { id, allowed }),
  getPermissions: () => ipcRenderer.invoke('permission:get-all'),
  setPermission: (host: string, permission: string, state: string) => ipcRenderer.invoke('permission:set', { host, permission, state }),
  removePermission: (host: string, permission: string) => ipcRenderer.invoke('permission:remove', { host, permission }),

  // Downloads
  getDownloads: () => ipcRenderer.invoke('downloads:get-all'),
  cancelDownload: (id: string) => ipcRenderer.invoke('downloads:cancel', id),
  removeDownload: (id: string) => ipcRenderer.invoke('downloads:remove', id),
  clearCompletedDownloads: () => ipcRenderer.invoke('downloads:clear-completed'),
  setDownloadPath: (p: string) => ipcRenderer.invoke('downloads:set-path', p),
  getDownloadPath: () => ipcRenderer.invoke('downloads:get-path'),
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
      focusWindow: (webContentsId: number) => Promise<void>;
      clearProfileData: (profileId: string) => Promise<{ cleared: boolean }>;
      saveDialog: (options: any) => Promise<any>;
      openDialog: (options: any) => Promise<any>;
      getAppVersion: () => Promise<string>;
      toggleAdBlocker: (enabled: boolean) => Promise<void>;
      getAdBlockerStatus: () => Promise<any>;
      toggleTrackerBlocking: (enabled: boolean) => Promise<{ trackerBlockingEnabled: boolean; trackerRuleCount: number }>;
      getTrackerBlockingStatus: () => Promise<{ trackerBlockingEnabled: boolean; trackerRuleCount: number }>;
      toggleHttpsOnly: (enabled: boolean) => Promise<{ httpsOnlyEnabled: boolean }>;
      getHttpsOnlyStatus: () => Promise<{ httpsOnlyEnabled: boolean }>;
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
      // Downloads
      getDownloads: () => Promise<Array<{ id: string; url: string; filePath: string | null; totalBytes: number; receivedBytes: number; state: string; startedAt: number; completedAt: number | null }>>;
      cancelDownload: (id: string) => Promise<{ ok: boolean }>;
      removeDownload: (id: string) => Promise<{ ok: boolean }>;
      clearCompletedDownloads: () => Promise<{ ok: boolean }>;
      setDownloadPath: (p: string) => Promise<{ ok: boolean; path: string }>;
      getDownloadPath: () => Promise<string>;
      // Main -> renderer events (allowlisted channels only)
      on: (channel: string, listener: (payload: unknown) => void) => number;
      off: (subscriptionId: number) => void;
    };
  }
}
