import { ipcMain, dialog, BrowserWindow } from 'electron';
import { windowManager } from './windowManager';

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
}
