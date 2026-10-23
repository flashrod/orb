import { ipcRenderer } from 'electron';

export type OrbIpc = {
  getWindowById: (webContentsId: number) => Promise<any>;
  openExternal: (url: string) => Promise<void>;
  toggleDevTools: (webContentsId: number) => Promise<void>;
  focusWindow: (webContentsId: number) => Promise<void>;
  saveDialog: (options: any) => Promise<any>;
  openDialog: (options: any) => Promise<any>;
  getAppVersion: () => Promise<string>;
};

export const orbIpc: OrbIpc = {
  getWindowById: (webContentsId: number) =>
    ipcRenderer.invoke('window:get-by-id', webContentsId),
  openExternal: (url: string) => ipcRenderer.invoke('window:open-external', url),
  toggleDevTools: (webContentsId: number) =>
    ipcRenderer.invoke('window:toggle-devtools', webContentsId),
  focusWindow: (webContentsId: number) => ipcRenderer.invoke('window:focus', webContentsId),
  saveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
  openDialog: (options: any) => ipcRenderer.invoke('dialog:open', options),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
};


