/**
 * Main -> renderer push events.
 *
 * The preload script may only subscribe to the channels listed here. Anything
 * else is rejected, so the renderer can never ask for an arbitrary IPC channel.
 */

import type { TabStateSnapshot } from './tabModel';

export type OrbPopupRequest = { url: string };

export type OrbPermissionRequest = {
  id: string;
  host: string;
  permission: string;
};

export type OrbDownloadUpdate = {
  id: string;
  url: string;
  filePath: string | null;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  startedAt: number;
  completedAt: number | null;
};

export type OrbShortcutAction =
  | 'new-tab'
  | 'new-space'
  | 'command-bar'
  | 'focus-address'
  | 'toggle-compact'
  | 'settings'
  | 'find'
  | 'print'
  | 'close-overlays';

export type { TabStateSnapshot } from './tabModel';

export type OrbEventMap = {
  'orb:popup-requested': OrbPopupRequest;
  'orb:permission-request': OrbPermissionRequest;
  'orb:download-updated': OrbDownloadUpdate;
  'orb:shortcut': OrbShortcutAction;
  'orb:tabs-state': TabStateSnapshot;
  'orb:tab-snapshot': { tabId: string; dataUrl: string };
  /** A native page view gained focus (e.g. the user clicked a split pane). */
  'orb:tab-focused': { tabId: string };
  /** Progress from find-in-page for a native tab. */
  'orb:find-result': { tabId: string; activeMatchOrdinal: number; matches: number };
};

export type OrbEventChannel = keyof OrbEventMap;

export const ORB_EVENT_CHANNELS: readonly OrbEventChannel[] = [
  'orb:popup-requested',
  'orb:permission-request',
  'orb:download-updated',
  'orb:shortcut',
  'orb:tabs-state',
  'orb:tab-snapshot',
  'orb:tab-focused',
  'orb:find-result',
];

export function isOrbEventChannel(channel: unknown): channel is OrbEventChannel {
  return typeof channel === 'string' && (ORB_EVENT_CHANNELS as readonly string[]).includes(channel);
}
