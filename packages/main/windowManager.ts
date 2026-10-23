import { BrowserWindow, app, session } from 'electron';
import path from 'node:path';

export interface SpaceWindow {
  id: string;
  spaceId: string;
  window: BrowserWindow | null;
}

export class WindowManager {
  private windows: Map<string, SpaceWindow> = new Map();

  createSpaceWindow(spaceId: string, url: string): BrowserWindow {
    const win = new BrowserWindow({
      width: 1100,
      height: 700,
      minWidth: 600,
      minHeight: 400,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        spellcheck: false,
        backgroundThrottling: false,
        session: session.fromPartition('persist:orb'),
      },
    });

    win.loadURL(url);

    win.webContents.on('did-finish-load', () => {
      win.show();
    });

    const entry: SpaceWindow = { id: win.webContents.id.toString(), spaceId, window: win };
    this.windows.set(entry.id, entry);

    win.on('closed', () => {
      this.windows.delete(entry.id);
    });

    return win;
  }

  getWindow(webContentsId: number): BrowserWindow | undefined {
    return this.windows.get(webContentsId.toString())?.window;
  }

  getWindowBySpaceId(spaceId: string): BrowserWindow | undefined {
    const entry = [...this.windows.values()].find((w) => w.spaceId === spaceId);
    return entry?.window;
  }

  destroyWindow(webContentsId: number): void {
    const entry = this.windows.get(webContentsId.toString());
    entry?.window?.destroy();
    this.windows.delete(webContentsId.toString());
  }

  destroyAll(): void {
    for (const entry of this.windows.values()) {
      entry.window?.destroy();
    }
    this.windows.clear();
  }

  list(): SpaceWindow[] {
    return [...this.windows.values()];
  }
}

export const windowManager = new WindowManager();
