import { app, BrowserWindow, ipcMain, shell, type WebContents } from 'electron';
import path from 'node:path';
import { registerIpcHandlers } from './ipcHandlers';
import { registerCertificateErrorHandler } from './certificates';
import { bindMediaKeys } from './mediaKeys';
import { NativeTabHost, registerNativeTabHandlers } from './nativeTabs';
import { adBlocker, initAdBlocker } from './adBlocker';
import { stripTrackingParams } from '../shared/privacy';
import { restoreExtensions } from './extensions';
import { createMenu } from './menu';
import { PermissionStore, type PermissionName, type PermissionState } from './permissions';
import { DownloadStore } from './downloads';
import { HistoryStore, fileHistoryStorage } from './historyStore';
import { findOpenUrl } from './cli';
import { shortcutForInput } from './shortcuts';
import { decideWindowIntent } from './popupPolicy';
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
// Native tabs are the default engine. Set ORB_NATIVE_TABS=0 to fall back to the
// legacy <webview> path while it is still being removed.
const NATIVE_TABS = process.env.ORB_NATIVE_TABS !== '0';
const PRELOAD_DIR = path.join(__dirname, 'preload');
const DEFAULT_PARTITION = 'persist:orb';

// Keep a global reference of the window object, otherwise it will be
// closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | null = null;
let sessionContext: SessionContext | null = null;
const nativeHosts = new WeakMap<BrowserWindow, NativeTabHost>();

// A browser should own its URLs: a second launch hands the link to the
// running instance instead of starting a second process.
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
}

let pendingLaunchUrl: string | null = null;

function deliverLaunchUrl(url: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    pendingLaunchUrl = url;
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('orb:popup-requested', { url });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  const target = findOpenUrl([url]);
  if (target) deliverLaunchUrl(target);
});

app.on('second-instance', (_event, argv) => {
  const target = findOpenUrl(argv);
  if (target) deliverLaunchUrl(target);
  else if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

function createMainWindow(ctx: SessionContext) {
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
    mainWindow.loadURL(`http://localhost:5173${NATIVE_TABS ? '?nativeTabs=1' : ''}`);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from vite-built renderer output (dist/renderer/)
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'), NATIVE_TABS ? { query: { nativeTabs: '1' } } : undefined);
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.show();
  });

  // The shell is an app UI, not a browser surface. Anything that tries to
  // navigate it away (a dropped file, a redirect, an injected link) is denied;
  // real links are handed to the system browser instead.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev
      ? url.startsWith('http://localhost:5173')
      : url.startsWith('file://');
    if (allowed) return;
    event.preventDefault();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // The shell drops the traffic-light insets while the window is fullscreen;
  // otherwise macOS leaves a 48px dead strip above the page.
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('orb:fullscreen-changed', { fullscreen: true });
  });
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('orb:fullscreen-changed', { fullscreen: false });
  });

  // Native page views live in the same window, above the React shell. The
  // renderer opts in per window; until it does, the webview path is untouched.
  nativeHosts.set(mainWindow, new NativeTabHost(mainWindow, ctx));

  return mainWindow;
}

/**
 * OAuth and passkey flows call `window.open(url, name, 'width=…,height=…')` and
 * then rely on `window.opener` plus the opener's cookies to finish. Turning
 * those into tabs breaks the handshake, so sized popups get a real window.
 * Ordinary `target="_blank"` links carry no size features and still become tabs.
 */
function decideWindowOpen(
  contents: WebContents,
  details: Electron.HandlerDetails,
): Electron.WindowOpenHandlerResponse {
  const intent = decideWindowIntent({
    url: details.url,
    features: details.features,
    isWebUrl: isWebUrl(details.url),
    fromShell: !BrowserWindow.fromWebContents(contents) || contents === mainWindow?.webContents,
  });

  if (intent === 'popup') {
    const opener = BrowserWindow.fromWebContents(contents);
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        ...(opener ? { parent: opener } : {}),
        width: 520,
        height: 700,
        minWidth: 380,
        minHeight: 460,
        autoHideMenuBar: true,
        fullscreenable: false,
        titleBarStyle: 'default',
        // No webPreferences override: the child inherits the opener's session,
        // sandbox and context isolation, which keeps the login cookie in the
        // same jar as the tab that opened it.
      },
    };
  }

  if (intent === 'tab' && isWebUrl(details.url)) {
    broadcast('orb:popup-requested', { url: stripTrackingParams(details.url) });
  }
  return { action: 'deny' };
}

/**
 * Enables the macOS platform authenticator so passkey sign-in can use the system
 * sheet (iCloud Keychain, 1Password, Bitwarden).
 *
 * This is opt-in because the entitlement chain is heavy: Apple requires the
 * Associated Domains entitlement, a real signing identity and an embedded
 * provisioning profile. An ad-hoc build cannot satisfy that, and switching the
 * authenticator on there turns every passkey request into a bare
 * `NotAllowedError` instead of letting Chromium fall back to a phone or a
 * security key. Signed builds set ORB_WEBAUTHN_PLATFORM_PASSKEYS=1; Touch ID
 * additionally needs ORB_WEBAUTHN_KEYCHAIN_GROUP.
 */
function configurePasskeys(): void {
  if (process.env.ORB_WEBAUTHN_PLATFORM_PASSKEYS !== '1') return;
  const keychainAccessGroup = process.env.ORB_WEBAUTHN_KEYCHAIN_GROUP;
  try {
    app.configureWebAuthn({
      ...(keychainAccessGroup ? { touchID: { keychainAccessGroup } } : {}),
      platformPasskeys: true,
    });
  } catch (error) {
    console.warn('[webauthn] Platform passkeys unavailable:', error instanceof Error ? error.message : error);
  }
}

/**
 * Accelerators do not fire while a guest page holds focus, so shortcuts pressed
 * inside a page are forwarded to the shell window instead. WebContentsView
 * reports type 'window', so compare identity with the shell rather than type.
 */
function forwardShortcutFromGuest(contents: WebContents, input: Electron.Input): void {
  if (contents === mainWindow?.webContents) return;
  if (contents.getType() === 'remote' || contents.getType() === 'backgroundPage') return;

  const matched = shortcutForInput(input);
  if (!matched) return;

  const host = contents.hostWebContents;
  const target = host && !host.isDestroyed() ? host : mainWindow?.webContents;
  if (target && !target.isDestroyed()) target.send('orb:shortcut', matched);
}

app.whenReady().then(async () => {
  configurePasskeys();
  if (!singleInstance) return;

  registerCertificateErrorHandler();
  bindMediaKeys();

  // Per-site permission choices, persisted under userData.
  const permissionStore = new PermissionStore();
  await permissionStore.load();

  const downloadStore = new DownloadStore();
  await downloadStore.load();

  const historyStore = new HistoryStore(
    fileHistoryStorage(path.join(app.getPath('userData'), 'history.json')),
  );
  await historyStore.load();

  let downloadPath = app.getPath('downloads');

  const ctx: SessionContext = {
    permissionStore,
    downloadStore,
    pendingPermissions: new Map<string, PendingPermission>(),
    activeDownloads: new Map(),
    getDownloadPath: () => downloadPath,
  };
  sessionContext = ctx;

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

  ipcMain.handle('app:take-launch-url', () => {
    const url = pendingLaunchUrl;
    pendingLaunchUrl = null;
    return url;
  });

  ipcMain.handle('history:query', (_, text: unknown, limit: unknown) =>
    historyStore.query(typeof text === 'string' ? text : '', typeof limit === 'number' ? limit : 20));
  ipcMain.handle('history:remove', async (_, url: unknown) => {
    if (typeof url === 'string') await historyStore.remove(url);
    return { ok: true };
  });
  ipcMain.handle('history:remove-host', async (_, host: unknown) => {
    if (typeof host !== 'string') return { ok: false, removed: 0 };
    return { ok: true, removed: await historyStore.removeHost(host) };
  });
  ipcMain.handle('history:clear-range', async (_, from: unknown, to: unknown) => {
    if (typeof from !== 'number' || typeof to !== 'number') return { ok: false, removed: 0 };
    return { ok: true, removed: await historyStore.clearRange(from, to) };
  });
  ipcMain.handle('history:clear', async () => {
    await historyStore.clear();
    return { ok: true };
  });
  ipcMain.handle('history:top', (_, limit: unknown) =>
    historyStore.topSites(typeof limit === 'number' ? limit : 8));
  ipcMain.handle('history:recent', (_, limit: unknown) =>
    historyStore.recentSites(typeof limit === 'number' ? limit : 6));

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
    // OAuth and passkey flows call `window.open(url, name, 'width=…,height=…')`
    // and then rely on `window.opener` plus the opener's cookies to finish.
    // Turning those into tabs breaks the handshake. Sized popups therefore get a
    // real window; ordinary target="_blank" links have no size features and are
    // still handed to the renderer as tabs.
    contents.setWindowOpenHandler((details) => decideWindowOpen(contents, details));

    // Pages should not be able to hand tracking identifiers to the next hop.
    // The shell has its own navigation guard, so leave window contents alone.
    if (contents !== mainWindow?.webContents) {
      contents.on('will-navigate', (event, url) => {
        const cleaned = stripTrackingParams(url);
        if (cleaned === url) return;
        event.preventDefault();
        void contents.loadURL(cleaned);
      });
    }

    contents.on('before-input-event', (_inputEvent, input) => {
      forwardShortcutFromGuest(contents, input);
    });

    // Record real page visits once the document settles, so the title is
    // available. The shell itself is not browsing history.
    contents.on('did-stop-loading', () => {
      // WebContentsView reports type 'window', so compare identity with the
      // shell instead of relying on the type name.
      if (contents === mainWindow?.webContents || contents.isDestroyed()) return;
      const url = contents.getURL();
      if (!isWebUrl(url)) return;
      void historyStore.record(url, contents.getTitle()).catch(() => undefined);
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
      guest.setWindowOpenHandler((details) => decideWindowOpen(guest, details));
      adBlocker.applyWebRtcPolicy(guest);
    });
  });

  await restoreExtensions();
  createMainWindow(ctx);
  registerIpcHandlers();
  registerNativeTabHandlers((event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? nativeHosts.get(win) : undefined;
  });
  createMenu();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // macOS keeps the process alive with no window; recreate with the same
    // session context that the first window used.
    const ctx = sessionContext;
    if (ctx) createMainWindow(ctx);
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
