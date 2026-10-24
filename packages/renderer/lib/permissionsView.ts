export type PermissionDecision = 'ask' | 'allow' | 'deny';

export type PermissionEntry = {
  host: string;
  permission: string;
  state: PermissionDecision;
  updatedAt?: number;
};

export type PermissionGroup = {
  host: string;
  entries: PermissionEntry[];
};

const PERMISSION_ORDER = ['camera', 'microphone', 'location', 'notifications', 'screen'];

function rank(permission: string): number {
  const index = PERMISSION_ORDER.indexOf(permission);
  return index === -1 ? PERMISSION_ORDER.length : index;
}

/**
 * Groups remembered permission decisions by host so the review screen can show
 * one row per site instead of one row per permission.
 */
export function groupPermissions(entries: PermissionEntry[]): PermissionGroup[] {
  const groups = new Map<string, PermissionEntry[]>();

  for (const entry of entries) {
    if (!entry || typeof entry.host !== 'string' || typeof entry.permission !== 'string') continue;
    const host = entry.host.trim().toLowerCase();
    if (!host || !entry.permission.trim()) continue;
    const list = groups.get(host) ?? [];
    list.push({ ...entry, host, permission: entry.permission.trim().toLowerCase() });
    groups.set(host, list);
  }

  return [...groups.entries()]
    .map(([host, list]) => ({
      host,
      entries: list.sort(
        (a, b) => rank(a.permission) - rank(b.permission) || a.permission.localeCompare(b.permission),
      ),
    }))
    .sort((a, b) => a.host.localeCompare(b.host));
}

export function permissionLabel(permission: string): string {
  switch (permission) {
    case 'camera':
      return 'Camera';
    case 'microphone':
      return 'Microphone';
    case 'location':
      return 'Location';
    case 'notifications':
      return 'Notifications';
    case 'screen':
      return 'Screen sharing';
    default:
      return permission;
  }
}

export function countDecisions(entries: PermissionEntry[]): { allow: number; deny: number } {
  let allow = 0;
  let deny = 0;
  for (const entry of entries) {
    if (entry.state === 'allow') allow += 1;
    else if (entry.state === 'deny') deny += 1;
  }
  return { allow, deny };
}
