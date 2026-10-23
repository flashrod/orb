import { contextBridge, ipcRenderer } from 'electron';

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('orbApi', {
  // Window management
  getWindowById: (webContentsId: number) =>
    ipcRenderer.invoke('window:get-by-id', webContentsId),
  openExternal: (url: string) => ipcRenderer.invoke('window:open-external', url),
  toggleDevTools: (webContentsId: number) =>
    ipcRenderer.invoke('window:toggle-devtools', webContentsId),
  focusWindow: (webContentsId: number) => ipcRenderer.invoke('window:focus', webContentsId),

  // Dialogs
  saveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
  openDialog: (options: any) => ipcRenderer.invoke('dialog:open', options),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Ad blocker
  toggleAdBlocker: (enabled: boolean) =>
    ipcRenderer.invoke('adblocker:set-enabled', enabled),

  // Boosts
  getBoosts: () => ipcRenderer.invoke('boosts:get-all'),
  saveBoost: (boost: any) => ipcRenderer.invoke('boosts:save', boost),
  deleteBoost: (id: string) => ipcRenderer.invoke('boosts:delete', id),
});

declare global {
  interface Window {
    orbApi: {
      getWindowById: (webContentsId: number) => Promise<any>;
      openExternal: (url: string) => Promise<void>;
      toggleDevTools: (webContentsId: number) => Promise<void>;
      focusWindow: (webContentsId: number) => Promise<void>;
      saveDialog: (options: any) => Promise<any>;
      openDialog: (options: any) => Promise<any>;
      getAppVersion: () => Promise<string>;
      toggleAdBlocker: (enabled: boolean) => Promise<void>;
      getBoosts: () => Promise<any[]>;
      saveBoost: (boost: any) => Promise<void>;
      deleteBoost: (id: string) => Promise<void>;
    };
  }
}
