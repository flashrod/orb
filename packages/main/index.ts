import { app, BrowserWindow, session, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { windowManager } from './windowManager';
import { registerIpcHandlers } from './ipcHandlers';
import { adBlocker, initAdBlocker } from './adBlocker';
import { restoreExtensions } from './extensions';
import { PermissionStore, PermissionName, PermissionState } from './permissions';

app.setAppUserModelId('company.thebrowser.orb');

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

  // Each workspace WebView uses a profile-specific persistent partition. Install
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
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
