import { ipcRenderer } from 'electron';

export const orbIpc = {
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

export type OrbIpc = typeof orbIpc;

declare global {
  interface Window {
    orbApi: OrbIpc;
  }
}
