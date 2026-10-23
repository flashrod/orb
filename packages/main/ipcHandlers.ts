import { ipcMain, dialog, BrowserWindow, session } from 'electron';
import { windowManager } from './windowManager';
import { adBlocker } from './adBlocker';
import { getBoostsDatabase } from './boostsDatabase';
import { NewBoost } from '../shared/boosts';
import { installExtension, listExtensions, removeExtension } from './extensions';
import { profilePartition } from '../shared/profiles';

export function registerIpcHandlers(): void {
  adBlocker.loadPreferences();
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
  ipcMain.handle('window:toggle-devtools', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.webContents.toggleDevTools();
  });

  ipcMain.handle('window:minimize-current', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('profile:clear-data', async (_event, profileId: string) => {
    if (typeof profileId !== 'string' || profileId === 'default' || !/^[a-z0-9_-]{1,96}$/i.test(profileId)) {
      return { cleared: false };
    }
    const profileSession = session.fromPartition(profilePartition(profileId));
    await profileSession.clearStorageData();
    await profileSession.clearCache();
    return { cleared: true };
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
      trackerBlockingEnabled: adBlocker.trackerBlockingEnabled,
      trackerRuleCount: adBlocker.getTrackerRuleCount(),
      httpsOnlyEnabled: adBlocker.isHttpsOnly(),
      allowlist: adBlocker.getAllowlist(),
      blockedRequests: adBlocker.getBlockedRequests(),
      filterLists: adBlocker.getFilterLists(),
    };
  });
  ipcMain.handle('adblocker:filter-lists-set', (_event, id: string, enabled: boolean) => {
    if (typeof id !== 'string' || typeof enabled !== 'boolean') throw new Error('Invalid filter list selection.');
    return adBlocker.setFilterListEnabled(id, enabled);
  });
  ipcMain.handle('adblocker:filter-lists-add', (_event, url: string, name?: string) => {
    if (typeof url !== 'string' || (name !== undefined && typeof name !== 'string')) throw new Error('Invalid filter list URL.');
    return adBlocker.addCustomFilterList(url, name);
  });
  ipcMain.handle('adblocker:filter-lists-remove', (_event, id: string) => {
    if (typeof id !== 'string') throw new Error('Invalid filter list selection.');
    return adBlocker.removeCustomFilterList(id);
  });
  ipcMain.handle('adblocker:filter-lists-refresh', () => adBlocker.loadLists().then(() => adBlocker.getFilterLists()));

  ipcMain.handle('adblocker:allowlist-add', (_event, value: string) => {
    if (typeof value !== 'string') throw new Error('Enter a valid site.');
    let domain = value.trim().toLowerCase();
    try { domain = new URL(domain.includes('://') ? domain : `https://${domain}`).hostname.toLowerCase(); }
    catch { throw new Error('Enter a valid domain name.'); }
    if (!domain || domain.includes('..') || domain === 'localhost') throw new Error('Enter a valid public site domain.');
    adBlocker.addToAllowlist(domain);
    return adBlocker.getAllowlist();
  });
  ipcMain.handle('adblocker:allowlist-remove', (_event, domain: string) => {
    if (typeof domain !== 'string') return adBlocker.getAllowlist();
    adBlocker.removeFromAllowlist(domain.toLowerCase());
    return adBlocker.getAllowlist();
  });
  ipcMain.handle('adblocker:blocked-log-clear', () => {
    adBlocker.clearBlockedRequests();
    return { cleared: true };
  });

  // Tracker blocking: toggle
  ipcMain.handle('adblocker:set-tracker-blocking', (_, enabled: boolean) => {
    adBlocker.setTrackerBlocking(enabled);
    return { trackerBlockingEnabled: adBlocker.trackerBlockingEnabled };
  });

  // Tracker blocking: get status
  ipcMain.handle('adblocker:get-tracker-status', () => {
    return {
      trackerBlockingEnabled: adBlocker.trackerBlockingEnabled,
      trackerRuleCount: adBlocker.getTrackerRuleCount(),
    };
  });

  // HTTPS-only: toggle
  ipcMain.handle('adblocker:set-https-only', (_, enabled: boolean) => {
    adBlocker.setHttpsOnly(enabled);
    return { httpsOnlyEnabled: adBlocker.isHttpsOnly() };
  });

  // HTTPS-only: get status
  ipcMain.handle('adblocker:get-https-status', () => {
    return { httpsOnlyEnabled: adBlocker.isHttpsOnly() };
  });

  // Ad blocker: import uBlock Origin filter list from file
  ipcMain.handle('adblocker:import-ublock-list', async (_, filePath: string) => {
    const count = await adBlocker.importUblockList(filePath);
    return { imported: count, total: adBlocker.getRuleCount() };
  });

  // Per-domain Boosts are kept in the app's SQLite database, never in site storage.
  ipcMain.handle('boosts:get-all', async () => (await getBoostsDatabase()).getAll());
  ipcMain.handle('boosts:save', async (_, boost: NewBoost) => (await getBoostsDatabase()).save(boost));
  ipcMain.handle('boosts:delete', async (_, id: string) => {
    (await getBoostsDatabase()).delete(id);
    return { deleted: true };
  });

  ipcMain.handle('extensions:list', () => listExtensions());
  ipcMain.handle('extensions:install', async () => {
    const owner = BrowserWindow.getFocusedWindow();
    const options = { title: 'Load unpacked extension', properties: ['openDirectory'] as ('openDirectory')[] };
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    return installExtension(result.filePaths[0]);
  });
  ipcMain.handle('extensions:remove', async (_, id: string) => {
    await removeExtension(id);
    return { removed: true };
  });
}
