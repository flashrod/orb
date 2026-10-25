import { BrowserWindow, app, globalShortcut } from 'electron';

/**
 * Media keys are global OS shortcuts. Register them only while an Orb window
 * is focused so music in another app keeps working when Orb is in the
 * background.
 */
let registered = false;

function playPause(): void {
  const win = BrowserWindow.getFocusedWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send('orb:shortcut', 'media-play-pause');
}

function register(): void {
  if (registered) return;
  registered = true;
  try {
    globalShortcut.register('MediaPlayPause', playPause);
  } catch {
    // Another app may own the key; Orb still exposes the menu command.
  }
}

function unregister(): void {
  if (!registered) return;
  registered = false;
  try {
    globalShortcut.unregister('MediaPlayPause');
  } catch {
    // Nothing to release.
  }
}

export function bindMediaKeys(): void {
  app.on('browser-window-focus', register);
  app.on('browser-window-blur', unregister);
  app.on('will-quit', unregister);
}
