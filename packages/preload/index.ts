import { contextBridge, ipcRenderer } from 'electron';
import { BoostRecord, NewBoost } from '../shared/boosts';

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('orbApi', {
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
      saveDialog: (options: any) => Promise<any>;
      openDialog: (options: any) => Promise<any>;
      getAppVersion: () => Promise<string>;
      toggleAdBlocker: (enabled: boolean) => Promise<void>;
      getAdBlockerStatus: () => Promise<any>;
      importUblockList: (filePath: string) => Promise<any>;
      getBoosts: () => Promise<BoostRecord[]>;
      saveBoost: (boost: NewBoost) => Promise<BoostRecord>;
      deleteBoost: (id: string) => Promise<{ deleted: boolean }>;
    };
  }
}
