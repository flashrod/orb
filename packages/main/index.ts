import { app, BrowserWindow, session, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { windowManager } from './windowManager';
import { registerIpcHandlers } from './ipcHandlers';
import { adBlocker, initAdBlocker } from './adBlocker';
import { restoreExtensions } from './extensions';
import { createMenu } from './menu';
import { PermissionStore, PermissionName, PermissionState } from './permissions';
import { DownloadStore, DownloadState } from './downloads';

app.setAppUserModelId('org.orb.browser');

// Keep a global reference of the window object, otherwise it will be
// closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true';

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
      preload: path.join(__dirname, 'preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      partition: 'persist:orb',
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

app.whenReady().then(async () => {
  const orbSession = session.fromPartition('persist:orb', { cache: true });
  initAdBlocker(orbSession);

  // Permission store: default-deny, per-site remembered choices
  const permissionStore = new PermissionStore();
  await permissionStore.load();

  // Pending permission requests awaiting user response from the renderer
  const pendingPermissions = new Map<string, { resolve: (allowed: boolean) => void; reject: () => void }>();

  // Popups: Electron 22+ removed the webview 'new-window' event. Intercept at the
  // session level, deny the popup window, and ask the renderer to open in a new tab.
  ;(orbSession as any).setWindowOpenHandler((details: any) => {
    const { url, referringWebContents } = details;
    const win = referringWebContents ? BrowserWindow.fromWebContents(referringWebContents) : null;
    if (win && url && url.startsWith('http')) {
      win.webContents.send('orb:popup-requested', url);
    }
    return { action: 'deny' };
  });

  // Permission requests: default-deny unless explicitly allowed.
  // If state is 'ask', prompt the renderer and wait for the user's choice.
  orbSession.setPermissionRequestHandler(async (webContents, permission) => {
    const url = webContents.getURL();
    let host = '';
    try { host = new URL(url).hostname; } catch { return false; }

    const stored = permissionStore.get(host, permission as PermissionName);
    if (stored === 'allow') return true;
    if (stored === 'deny') return false;

    // 'ask' → prompt the renderer (async). Return a promise that resolves when the user answers.
    return new Promise<boolean>((resolve) => {
      const id = `${webContents.id}|${permission}|${Date.now()}`;
      pendingPermissions.set(id, { resolve, reject: () => resolve(false) });
      // Notify all windows that a permission decision is needed
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('orb:permission-request', { id, host, permission });
      }
    });
  });

  // Permission check handler: called by Chromium to check if a permission is allowed
  // without a user gesture (e.g. for persistent permissions).
  orbSession.setPermissionCheckHandler((webContents, permission) => {
    if (!webContents) return false;
    const url = webContents.getURL();
    let host = '';
    try { host = new URL(url).hostname; } catch { return false; }
    const stored = permissionStore.get(host, permission as PermissionName);
    return stored === 'allow';
  });

  // Expose permission store and pending map to IPC handlers
  ;(global as any).__ORB_PERMISSION_STORE = permissionStore;
  ;(global as any).__ORB_PENDING_PERMISSIONS = pendingPermissions;

  // Expose a way for the renderer to resolve a pending permission
  ipcMain.handle('permission:respond', (_, { id, allowed }: { id: string; allowed: boolean }) => {
    const pending = pendingPermissions.get(id);
    if (pending) {
      pending.resolve(allowed);
      pendingPermissions.delete(id);
    }
    return { ok: true };
  });

  ipcMain.handle('permission:get-all', () => permissionStore.getAll());
  ipcMain.handle('permission:set', async (_, { host, permission, state }: { host: string; permission: string; state: PermissionState }) => {
    await permissionStore.set(host, permission as PermissionName, state);
    return { ok: true };
  });
  ipcMain.handle('permission:remove', async (_, { host, permission }: { host: string; permission: string }) => {
    await permissionStore.remove(host, permission as PermissionName);
    return { ok: true };
  });

  // Download path: configurable from settings, defaults to system Downloads folder
  let downloadPath = path.join(app.getPath('downloads'));

  // Download store
  const downloadStore = new DownloadStore();
  await downloadStore.load();

  // Downloads: intercept will-download, track progress, expose to renderer
  orbSession.on('will-download', (event, item, webContents) => {
    event.preventDefault();
    const url = item.getURL() || '';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const filePath = path.join(downloadPath, item.getFilename() || 'download');

    downloadStore.add({
      id,
      url,
      filePath,
      totalBytes: 0,
      receivedBytes: 0,
      state: 'progressing',
      startedAt: Date.now(),
      completedAt: null,
    });

    item.setSavePath(filePath);

    item.on('updated', (_, state) => {
      const downloadState = state as DownloadState;
      if (downloadState === 'progressing') {
        downloadStore.update(id, {
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes(),
          state: 'progressing',
        });
      } else if (downloadState === 'completed') {
        downloadStore.update(id, {
          state: 'completed',
          completedAt: Date.now(),
          totalBytes: item.getTotalBytes(),
          receivedBytes: item.getReceivedBytes(),
        });
      } else if (downloadState === 'cancelled') {
        downloadStore.update(id, { state: 'cancelled' });
      } else if (downloadState === 'interrupted') {
        downloadStore.update(id, { state: 'interrupted' });
      }
      const updated = downloadStore.get(id);
      if (updated) {
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('orb:download-updated', updated);
        }
      }
    });

    item.on('done', (_, state) => {
      const doneState = state as DownloadState;
      if (doneState === 'completed') {
        downloadStore.update(id, { state: 'completed', completedAt: Date.now() });
      }
    });
  });

  // IPC: downloads
  ipcMain.handle('downloads:get-all', () => downloadStore.getAll());
  ipcMain.handle('downloads:cancel', (_, id: string) => {
    downloadStore.update(id, { state: 'cancelled' });
    return { ok: true };
  });
  ipcMain.handle('downloads:remove', (_, id: string) => {
    downloadStore.remove(id);
    return { ok: true };
  });
  ipcMain.handle('downloads:clear-completed', () => {
    downloadStore.clearCompleted();
    return { ok: true };
  });
  ipcMain.handle('downloads:set-path', (_, p: string) => {
    downloadPath = p;
    return { ok: true, path: downloadPath };
  });
  ipcMain.handle('downloads:get-path', () => downloadPath);

  // Expose download store to IPC
  ;(global as any).__ORB_DOWNLOAD_STORE = downloadStore;

  // Popups: Electron 22+ removed the webview 'new-window' event. Intercept at the
  // privacy hooks before Chromium attaches that WebView to its session.
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (_attachEvent, webPreferences) => {
      const partition = webPreferences.partition;
      webPreferences.preload = path.join(__dirname, 'preload/webview.js');
      if (partition === 'persist:orb' || partition?.startsWith('persist:orb-profile-')) {
        initAdBlocker(session.fromPartition(partition, { cache: true }));
      }
    });
    contents.on('did-attach-webview', (_event, webContents) => adBlocker.applyWebRtcPolicy(webContents));
  });
  await restoreExtensions();
  createMainWindow();
  registerIpcHandlers();
  createMenu();

  // Forward global keyboard shortcuts from web contents to the renderer,
  // since accelerators in the app menu don't fire when a webview has focus.
  const forwardShortcut = (webContents: Electron.WebContents, keyDown: KeyboardEvent) => {
    const { key, metaKey, ctrlKey, shiftKey } = keyDown;
    let action: string | null = null;
    if ((metaKey || ctrlKey) && key === 't' && !shiftKey) action = 'new-tab';
    else if ((metaKey || ctrlKey) && key === 'k' && !shiftKey) action = 'command-bar';
    else if ((metaKey || ctrlKey) && key === 'l' && !shiftKey) action = 'focus-address';
    else if ((metaKey || ctrlKey) && shiftKey && key.toLowerCase() === 'm') action = 'toggle-compact';
    else if (key === 'Escape' && !metaKey && !ctrlKey && !shiftKey) action = 'close-overlays';

    if (action) {
      webContents.send('orb:shortcut', action);
    }
  };

  app.on('web-contents-created', (_event, contents) => {
    contents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown') {
        forwardShortcut(contents, input as unknown as KeyboardEvent);
      }
    });
    contents.on('will-attach-webview', (_attachEvent, webPreferences) => {
      const partition = webPreferences.partition;
      webPreferences.preload = path.join(__dirname, 'preload/webview.js');
      if (partition === 'persist:orb' || partition?.startsWith('persist:orb-profile-')) {
        initAdBlocker(session.fromPartition(partition, { cache: true }));
      }
    });
    contents.on('did-attach-webview', (_event, webContents) => adBlocker.applyWebRtcPolicy(webContents));
  });
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
