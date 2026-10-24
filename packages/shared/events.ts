/**
 * Main -> renderer push events.
 *
 * The preload script may only subscribe to the channels listed here. Anything
 * else is rejected, so the renderer can never ask for an arbitrary IPC channel.
 */

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
  | 'close-overlays';

export type OrbEventMap = {
  'orb:popup-requested': OrbPopupRequest;
  'orb:permission-request': OrbPermissionRequest;
  'orb:download-updated': OrbDownloadUpdate;
  'orb:shortcut': OrbShortcutAction;
};

export type OrbEventChannel = keyof OrbEventMap;

export const ORB_EVENT_CHANNELS: readonly OrbEventChannel[] = [
  'orb:popup-requested',
  'orb:permission-request',
  'orb:download-updated',
  'orb:shortcut',
];

export function isOrbEventChannel(channel: unknown): channel is OrbEventChannel {
  return typeof channel === 'string' && (ORB_EVENT_CHANNELS as readonly string[]).includes(channel);
}
