import { app, shell } from 'electron';
import { defaultBrowserSettingsUrl } from '../shared/defaultBrowser';

export interface DefaultBrowserStatus {
  isDefault: boolean;
  platform: NodeJS.Platform;
}

function readStatus(): DefaultBrowserStatus {
  return {
    isDefault: app.isDefaultProtocolClient('http') && app.isDefaultProtocolClient('https'),
    platform: process.platform,
  };
}

export function getDefaultBrowserStatus(): DefaultBrowserStatus {
  return readStatus();
}

/**
 * Asks the OS to hand HTTP(S) links to Orb. Both macOS and Windows may still
 * show a confirmation prompt; callers should re-read the status afterwards.
 */
export function requestDefaultBrowser(): DefaultBrowserStatus {
  for (const protocol of ['http', 'https']) {
    try {
      app.setAsDefaultProtocolClient(protocol);
    } catch {
      // Some Linux desktops do not implement this; the status check is the
      // source of truth.
    }
  }
  return readStatus();
}

export async function openDefaultBrowserSettings(): Promise<{ opened: boolean }> {
  const url = defaultBrowserSettingsUrl(process.platform);
  if (!url) return { opened: false };
  await shell.openExternal(url);
  return { opened: true };
}
