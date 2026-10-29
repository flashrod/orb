import { ipcMain, dialog, BrowserWindow, screen, session, shell, app } from 'electron';
import path from 'node:path';
import { windowManager } from './windowManager';
import { adBlocker } from './adBlocker';
import { normalizeExceptionDomain } from './httpsOnly';
import { appendErrorLog, clampReport, ERROR_LOG_NAME } from './errorLog';
import { interpretReleaseList } from '../shared/updates';
import { getBoostsDatabase } from './boostsDatabase';
import { NewBoost } from '../shared/boosts';
import { installExtension, listExtensions, removeExtension } from './extensions';
import { setKeymapOverride, setKeymapOverrides, keymapOverrides, setPassthroughRules, passthroughRules } from './shortcuts';
import { profilePartition } from '../shared/profiles';
import { getDefaultBrowserStatus, openDefaultBrowserSettings, requestDefaultBrowser } from './defaultBrowser';
import { savePdfBuffer } from './pdf';
import { requireString, requireWebUrl } from './webUrl';

function requireId(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

function requireDialogOptions(value: unknown): Electron.OpenDialogOptions | Electron.SaveDialogOptions {
  if (!value || typeof value !== 'object') throw new Error('Invalid dialog options.');
  const options = value as Record<string, unknown>;
  if (options.defaultPath !== undefined && typeof options.defaultPath !== 'string') {
    throw new Error('Invalid dialog defaultPath.');
  }
  if (options.title !== undefined && typeof options.title !== 'string') {
    throw new Error('Invalid dialog title.');
  }
  return value as Electron.OpenDialogOptions;
}

export function registerIpcHandlers(): void {
  adBlocker.loadPreferences();
  // Get window by webContents ID
  ipcMain.handle('window:get-by-id', (_, webContentsId: number) => {
    requireId(webContentsId, 'window id');
    const win = windowManager.getWindow(webContentsId);
    return win ? { id: win.webContents.id, url: win.webContents.getURL() } : null;
  });

  // Open external link in default browser
  ipcMain.handle('window:open-external', async (_, url: string) => {
    return shell.openExternal(requireWebUrl(url));
  });

  // Show save dialog
  ipcMain.handle('dialog:save', async (_, options: any) => {
    return dialog.showSaveDialog(requireDialogOptions(options) as Electron.SaveDialogOptions);
  });

  // Show open dialog
  ipcMain.handle('dialog:open', async (_, options: any) => {
    return dialog.showOpenDialog(requireDialogOptions(options) as Electron.OpenDialogOptions);
  });

  // Get app version. In a packaged build npm_package_version is absent, so read
  // the version electron-builder wrote into the app bundle.
  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('app:get-build-info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  }));

  // Renderer crash log. Alpha testers will not have a debugger attached, so a
  // render error leaves a file they can send.
  ipcMain.handle('app:report-renderer-error', (_event, payload: unknown) => {
    const report = clampReport((payload as { report?: unknown } | null)?.report);
    if (!report) return { saved: false };
    const saved = appendErrorLog(path.join(app.getPath('userData'), ERROR_LOG_NAME), report);
    return { saved };
  });

  // Update check. Orb does not update itself yet, so this only answers "is
  // there a newer release?" and hands back its page. The list endpoint is used
  // because /releases/latest hides prereleases, and the alpha channel is all
  // prereleases. GitHub allows 60 anonymous requests an hour, which is why the
  // renderer checks on demand and not on a timer.
  ipcMain.handle('app:check-for-updates', async () => {
    const currentVersion = app.getVersion();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('https://api.github.com/repos/flashrod/orb/releases?per_page=20', {
        headers: { accept: 'application/vnd.github+json', 'user-agent': `Orb/${currentVersion}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        return {
          status: 'error',
          currentVersion,
          latestVersion: null,
          url: null,
          notes: null,
          error: response.status === 404 ? 'No release has been published yet.' : `GitHub returned ${response.status}.`,
        };
      }
      return interpretReleaseList(await response.json(), currentVersion);
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      return {
        status: 'error',
        currentVersion,
        latestVersion: null,
        url: null,
        notes: null,
        error: aborted ? 'The update check timed out.' : 'Orb could not reach GitHub.',
      };
    } finally {
      clearTimeout(timer);
    }
  });

  ipcMain.handle('app:default-browser-status', () => getDefaultBrowserStatus());
  ipcMain.handle('app:set-default-browser', () => requestDefaultBrowser());
  ipcMain.handle('app:open-default-browser-settings', () => openDefaultBrowserSettings());

  ipcMain.handle('pdf:save', async (event, data: unknown, suggestedName: unknown) => {
    if (!(data instanceof Uint8Array) || data.byteLength === 0 || data.byteLength > 200 * 1024 * 1024) {
      throw new Error('Invalid PDF data.');
    }
    const name = typeof suggestedName === 'string' ? suggestedName : 'page';
    return savePdfBuffer(Buffer.from(data), name, BrowserWindow.fromWebContents(event.sender));
  });

  // Toggle dev tools
  ipcMain.handle('window:toggle-devtools', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.webContents.toggleDevTools();
  });

  ipcMain.handle('window:minimize-current', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('window:is-fullscreen', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false;
  });

  ipcMain.handle('window:toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    // Simple fullscreen only covers the work area (menu bar stays visible).
    // If a window somehow ended up there, step back to native fullscreen.
    if (win.isSimpleFullScreen()) {
      win.setSimpleFullScreen(false);
      win.setFullScreen(true);
      return true;
    }
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
  });

  ipcMain.handle('window:fullscreen-debug', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const display = screen.getDisplayMatching(win.getBounds());
    return {
      full: win.isFullScreen(),
      simple: win.isSimpleFullScreen(),
      bounds: win.getBounds(),
      content: win.getContentBounds(),
      display: display.bounds,
      workArea: display.workArea,
    };
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
    requireId(webContentsId, 'window id');
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
      httpsExceptions: adBlocker.getHttpsExceptions(),
      thirdPartyCookieBlockingEnabled: adBlocker.thirdPartyCookieBlockingEnabled,
      webRtcProtectionEnabled: adBlocker.webRtcProtectionEnabled,
      fingerprintingProtectionEnabled: adBlocker.fingerprintingProtectionEnabled,
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
  ipcMain.handle('adblocker:third-party-cookies-set', (_event, enabled: boolean) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid cookie protection value.');
    adBlocker.setThirdPartyCookieBlocking(enabled);
    return { enabled };
  });
  ipcMain.handle('adblocker:fingerprinting-set', (_event, enabled: boolean) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid fingerprinting protection value.');
    adBlocker.setFingerprintingProtection(enabled);
    return { enabled };
  });
  ipcMain.handle('adblocker:webrtc-set', (_event, enabled: boolean) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid WebRTC protection value.');
    adBlocker.setWebRtcProtection(enabled);
    return { enabled };
  });

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
    return { httpsOnlyEnabled: adBlocker.isHttpsOnly(), httpsExceptions: adBlocker.getHttpsExceptions() };
  });

  // HTTPS-only: per-site exceptions, for sites that only work over plain HTTP
  ipcMain.handle('adblocker:https-exception-add', (_event, value: string) => {
    if (typeof value !== 'string') throw new Error('Enter a valid site.');
    const domain = normalizeExceptionDomain(value);
    if (!domain || domain.includes('..')) throw new Error('Enter a valid domain name.');
    return adBlocker.addHttpsException(domain);
  });
  ipcMain.handle('adblocker:https-exception-remove', (_event, domain: string) => {
    if (typeof domain !== 'string') return adBlocker.getHttpsExceptions();
    return adBlocker.removeHttpsException(domain);
  });

  // Ad blocker: import uBlock Origin filter list from file
  ipcMain.handle('adblocker:import-ublock-list', async (_, filePath: string) => {
    const count = await adBlocker.importUblockList(requireString(filePath, 'file path'));
    return { imported: count, total: adBlocker.getRuleCount() };
  });

  // Per-domain Boosts are kept in the app's SQLite database, never in site storage.
  ipcMain.handle('boosts:get-all', async () => (await getBoostsDatabase()).getAll());
  ipcMain.handle('boosts:save', async (_, boost: NewBoost) => {
    if (!boost || typeof boost !== 'object') throw new Error('Invalid Boost.');
    requireString(boost.domain, 'Boost domain', 255);
    if (typeof boost.css !== 'string' || typeof boost.js !== 'string') throw new Error('Invalid Boost body.');
    if (typeof boost.enabled !== 'boolean') throw new Error('Invalid Boost enabled flag.');
    return (await getBoostsDatabase()).save(boost);
  });
  ipcMain.handle('boosts:delete', async (_, id: string) => {
    (await getBoostsDatabase()).delete(requireString(id, 'Boost id', 128));
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
    await removeExtension(requireString(id, 'extension id', 256));
    return { removed: true };
  });

  // Keymap overrides synced from the renderer preferences store.
  ipcMain.handle('keymap:get-overrides', () => keymapOverrides);
  ipcMain.handle('keymap:set-override', (_, commandId: string, bindings: string[] | null) => {
    if (typeof commandId !== 'string') throw new Error('Invalid command id.');
    setKeymapOverride(commandId, bindings);
    return { ok: true };
  });
  ipcMain.handle('keymap:set-overrides', (_, overrides: Record<string, string[] | null>) => {
    setKeymapOverrides(overrides);
    return { ok: true };
  });
  ipcMain.handle('keymap:get-passthrough-rules', () => passthroughRules);
  ipcMain.handle('keymap:set-passthrough-rule', (_, domain: string, commandIds: string[]) => {
    if (typeof domain !== 'string' || !Array.isArray(commandIds)) throw new Error('Invalid passthrough rule.');
    setPassthroughRules({ ...passthroughRules, [domain]: commandIds });
    return { ok: true };
  });
  ipcMain.handle('keymap:set-passthrough-rules', (_, rules: Record<string, string[]>) => {
    setPassthroughRules(rules);
    return { ok: true };
  });
}
