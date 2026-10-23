import { ipcMain, dialog, BrowserWindow } from 'electron';
import { windowManager } from './windowManager';
import { adBlocker } from './adBlocker';

export function registerIpcHandlers(): void {
  // Get window by webContents ID
  ipcMain.handle('window:get-by-id', (_, webContentsId: number) => {
    const win = windowManager.getWindow(webContentsId);
    return win ? { id: win.webContents.id, url: win.webContents.getURL() } : null;
  });

  // Open external link in default browser
  ipcMain.handle('window:open-external', async (_, url: string) => {
    const { shell } = await import('electron');
    return shell.openExternal(url);
  });

  // Show save dialog
  ipcMain.handle('dialog:save', async (_, options: any) => {
    return dialog.showSaveDialog(options);
  });

  // Show open dialog
  ipcMain.handle('dialog:open', async (_, options: any) => {
    return dialog.showOpenDialog(options);
  });

  // Get app version
  ipcMain.handle('app:get-version', () => {
    return process.env.npm_package_version || '0.1.0';
  });

  // Toggle dev tools
  ipcMain.handle('window:toggle-devtools', (_, webContentsId: number) => {
    const win = windowManager.getWindow(webContentsId);
    if (win) {
      win.webContents.toggleDevTools();
    }
  });

  // Focus window
  ipcMain.handle('window:focus', (_, webContentsId: number) => {
    const win = windowManager.getWindow(webContentsId);
    if (win) {
      win.focus();
    }
  });

  // Ad blocker: toggle enabled state
  ipcMain.handle('adblocker:set-enabled', (_, enabled: boolean) => {
    adBlocker.setEnabled(enabled);
    return { enabled: adBlocker.enabled };
  });

  // Ad blocker: get status
  ipcMain.handle('adblocker:get-status', () => {
    return {
      enabled: adBlocker.enabled,
      ruleCount: adBlocker.getRuleCount(),
    };
  });

  // Ad blocker: import uBlock Origin filter list from file
  ipcMain.handle('adblocker:import-ublock-list', async (_, filePath: string) => {
    const count = await adBlocker.importUblockList(filePath);
    return { imported: count, total: adBlocker.getRuleCount() };
  });
}
