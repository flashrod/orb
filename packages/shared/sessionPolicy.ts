/**
 * Pure session policy helpers, shared by the main process and tests.
 * No Electron imports here so the rules can be unit-tested directly.
 */

export type OrbPermissionName = 'notifications' | 'camera' | 'microphone' | 'location' | 'screen';

export type StoredPermissionState = 'ask' | 'allow' | 'deny';

export type PermissionDecision =
  | { action: 'allow' }
  | { action: 'deny' }
  | { action: 'ask'; permission: OrbPermissionName };

/**
 * Permissions that are safe to grant without asking because they cannot expose
 * user data or devices. Everything else must be explicitly managed.
 */
const ALWAYS_ALLOWED = new Set(['fullscreen']);

/** Electron permission strings mapped onto the permissions Orb remembers. */
export function toOrbPermission(
  permission: string,
  mediaTypes?: readonly string[],
): OrbPermissionName | null {
  switch (permission) {
    case 'notifications':
      return 'notifications';
    case 'geolocation':
      return 'location';
    case 'display-capture':
      return 'screen';
    case 'media': {
      const types = mediaTypes ?? [];
      if (types.includes('video')) return 'camera';
      return 'microphone';
    }
    default:
      return null;
  }
}

/**
 * Decides how to answer a permission request. Unmanaged permissions are denied
 * unless they are explicitly harmless; managed permissions follow the stored
 * per-site choice and otherwise go to the user.
 */
export function decidePermission(
  permission: string,
  stored: StoredPermissionState | null | undefined,
  mediaTypes?: readonly string[],
): PermissionDecision {
  if (ALWAYS_ALLOWED.has(permission)) return { action: 'allow' };

  const orbPermission = toOrbPermission(permission, mediaTypes);
  if (!orbPermission) return { action: 'deny' };

  if (stored === 'allow') return { action: 'allow' };
  if (stored === 'deny') return { action: 'deny' };
  return { action: 'ask', permission: orbPermission };
}

/** Orb's own partitions: the default one and every profile partition. */
export function isOrbPartition(partition?: string | null): boolean {
  if (!partition) return false;
  return partition === 'persist:orb' || partition.startsWith('persist:orb-profile-');
}

/** Only http(s) URLs may be opened as tabs by page-initiated popups. */
export function isWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function hostFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.trim().toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

/** Appends " (n)" until the filename no longer collides with an existing file. */
export function uniqueFilename(
  filename: string,
  exists: (candidate: string) => boolean,
): string {
  if (!exists(filename)) return filename;
  const dot = filename.lastIndexOf('.');
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  let counter = 1;
  let candidate = `${base} (${counter})${ext}`;
  while (exists(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})${ext}`;
  }
  return candidate;
}
