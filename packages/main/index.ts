import { app, BrowserWindow, ipcMain, type WebContents } from 'electron';
import path from 'node:path';
import { registerIpcHandlers } from './ipcHandlers';
import { adBlocker, initAdBlocker } from './adBlocker';
import { restoreExtensions } from './extensions';
import { createMenu } from './menu';
import { PermissionStore, type PermissionName, type PermissionState } from './permissions';
import { DownloadStore } from './downloads';
import {
  broadcast,
  isOrbPartition,
  isWebUrl,
  orbSessionFor,
  type PendingPermission,
  type SessionContext,
} from './sessions';

app.setAppUserModelId('org.orb.browser');

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true';
const PRELOAD_DIR = path.join(__dirname, 'preload');
const DEFAULT_PARTITION = 'persist:orb';

// Keep a global reference of the window object, otherwise it will be
// closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: path.join(PRELOAD_DIR, 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: true,
      partition: DEFAULT_PARTITION,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from vite-built renderer output (dist/renderer/)
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

type ShortcutAction = 'new-tab' | 'command-bar' | 'focus-address' | 'toggle-compact' | 'close-overlays';

/**
 * Accelerators do not fire while a guest <webview> holds focus, so shortcuts
 * pressed inside a page are forwarded to the shell window instead.
 */
function forwardShortcutFromGuest(contents: WebContents, input: Electron.Input): void {
  if (input.type !== 'keyDown' || input.isAutoRepeat) return;
  if (contents.getType() !== 'webview') return;

  const key = input.key.toLowerCase();
  const command = input.meta || input.control;
  let action: ShortcutAction | null = null;

  if (command && !input.shift && key === 't') action = 'new-tab';
  else if (command && !input.shift && key === 'k') action = 'command-bar';
  else if (command && !input.shift && key === 'l') action = 'focus-address';
  else if (command && input.shift && key === 'm') action = 'toggle-compact';
  else if (!command && !input.shift && key === 'escape') action = 'close-overlays';

  if (!action) return;

  const host = contents.hostWebContents;
  const target = host && !host.isDestroyed() ? host : mainWindow?.webContents;
  if (target && !target.isDestroyed()) target.send('orb:shortcut', action);
}

app.whenReady().then(async () => {
  // Per-site permission choices, persisted under userData.
  const permissionStore = new PermissionStore();
  await permissionStore.load();

  const downloadStore = new DownloadStore();
  await downloadStore.load();

  let downloadPath = app.getPath('downloads');

  const ctx: SessionContext = {
    permissionStore,
    downloadStore,
    pendingPermissions: new Map<string, PendingPermission>(),
    activeDownloads: new Map(),
    getDownloadPath: () => downloadPath,
  };

  // Default partition: hardened before any window or webview exists.
  const orbSession = orbSessionFor(DEFAULT_PARTITION, ctx);
  initAdBlocker(orbSession);

  ipcMain.handle('permission:respond', (_, { id, allowed }: { id: string; allowed: boolean }) => {
    if (typeof id !== 'string' || typeof allowed !== 'boolean') return { ok: false };
    const pending = ctx.pendingPermissions.get(id);
    if (!pending) return { ok: false };
    pending.resolve(allowed);
    return { ok: true };
  });

  ipcMain.handle('permission:get-all', () => permissionStore.getAll());
  ipcMain.handle('permission:set', async (_, { host, permission, state }: { host: string; permission: string; state: PermissionState }) => {
    if (typeof host !== 'string' || typeof permission !== 'string') return { ok: false };
    if (state !== 'ask' && state !== 'allow' && state !== 'deny') return { ok: false };
    await permissionStore.set(host, permission as PermissionName, state);
    return { ok: true };
  });
  ipcMain.handle('permission:remove', async (_, { host, permission }: { host: string; permission: string }) => {
    if (typeof host !== 'string' || typeof permission !== 'string') return { ok: false };
    await permissionStore.remove(host, permission as PermissionName);
    return { ok: true };
  });

  ipcMain.handle('downloads:get-all', () => downloadStore.getAll());
  ipcMain.handle('downloads:cancel', (_, id: string) => {
    if (typeof id !== 'string') return { ok: false };
    ctx.activeDownloads.get(id)?.cancel();
    downloadStore.update(id, { state: 'cancelled' });
    return { ok: true };
  });
  ipcMain.handle('downloads:remove', (_, id: string) => {
    if (typeof id !== 'string') return { ok: false };
    downloadStore.remove(id);
    return { ok: true };
  });
  ipcMain.handle('downloads:clear-completed', () => {
    downloadStore.clearCompleted();
    return { ok: true };
  });
  ipcMain.handle('downloads:set-path', (_, p: string) => {
    if (typeof p !== 'string' || !p.trim()) return { ok: false, path: downloadPath };
    downloadPath = p;
    return { ok: true, path: downloadPath };
  });
  ipcMain.handle('downloads:get-path', () => downloadPath);

  // Single registration point for every webContents in the app.
  app.on('web-contents-created', (_event, contents) => {
    // Never let a page (or the shell) open a native window. http(s) targets are
    // handed to the renderer, which opens them as tabs.
    contents.setWindowOpenHandler((details) => {
      if (isWebUrl(details.url)) broadcast('orb:popup-requested', { url: details.url });
      return { action: 'deny' };
    });

    contents.on('before-input-event', (_inputEvent, input) => {
      forwardShortcutFromGuest(contents, input);
    });

    contents.on('will-attach-webview', (_attachEvent, webPreferences) => {
      // Page views always run the narrow page preload, sandboxed.
      webPreferences.preload = path.join(PRELOAD_DIR, 'webview.js');
      webPreferences.sandbox = true;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;

      const partition = webPreferences.partition || DEFAULT_PARTITION;
      if (!isOrbPartition(partition)) return;

      webPreferences.partition = partition;
      const guestSession = orbSessionFor(partition, ctx);
      initAdBlocker(guestSession);
    });

    contents.on('did-attach-webview', (_attachEvent, guest) => {
      guest.setWindowOpenHandler((details) => {
        if (isWebUrl(details.url)) broadcast('orb:popup-requested', { url: details.url });
        return { action: 'deny' };
      });
      adBlocker.applyWebRtcPolicy(guest);
    });
  });

  await restoreExtensions();
  createMainWindow();
  registerIpcHandlers();
  createMenu();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Graceful shutdown
app.on('quit', () => {
  mainWindow = null;
});
