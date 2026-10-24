import type { Tab, TabGroup } from '../stores/tabs';

export const SESSION_SNAPSHOT_KEY = 'orb-last-session';

/** The parts of a tab worth restoring after the live store is gone. */
export type RestorableTab = {
  url: string;
  title: string;
  favicon: string;
  isPinned: boolean;
  spaceId: string;
};

export type SessionSnapshot = {
  savedAt: number;
  tabs: RestorableTab[];
  groups: TabGroup[];
  activeTabId: string | null;
};

export function captureSession(
  tabs: Tab[],
  groups: TabGroup[],
  activeTabId: string | null,
  now = Date.now(),
): SessionSnapshot | null {
  // Blank tabs are scaffolding, not content. A session with only a new tab
  // must not erase the last session that actually had pages open.
  const restorable = tabs.filter((tab) => tab.url && tab.url !== 'about:blank');
  if (restorable.length === 0) return null;

  return {
    savedAt: now,
    activeTabId,
    groups: groups.map((group) => ({ ...group })),
    tabs: restorable.map((tab) => ({
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      isPinned: tab.isPinned,
      spaceId: tab.spaceId,
    })),
  };
}

export function parseSessionSnapshot(raw: string | null): SessionSnapshot | null {
  if (!raw) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.tabs)) return null;

  const tabs: RestorableTab[] = [];
  for (const item of record.tabs) {
    if (!item || typeof item !== 'object') continue;
    const tab = item as Record<string, unknown>;
    if (typeof tab.url !== 'string' || !tab.url || tab.url === 'about:blank') continue;
    tabs.push({
      url: tab.url,
      title: typeof tab.title === 'string' ? tab.title : '',
      favicon: typeof tab.favicon === 'string' ? tab.favicon : '',
      isPinned: Boolean(tab.isPinned),
      spaceId: typeof tab.spaceId === 'string' ? tab.spaceId : '',
    });
  }
  if (tabs.length === 0) return null;

  return {
    savedAt: typeof record.savedAt === 'number' && Number.isFinite(record.savedAt) ? record.savedAt : 0,
    tabs,
    groups: Array.isArray(record.groups)
      ? (record.groups as TabGroup[]).filter((group) => group && typeof group.id === 'string' && typeof group.name === 'string')
      : [],
    activeTabId: typeof record.activeTabId === 'string' ? record.activeTabId : null,
  };
}

/** A tab ready to hand to `addTab`, with its space resolved. */
export type RestoreTabInput = RestorableTab & { isActive: true };

/**
 * Resolves snapshot tabs against the spaces that still exist. Tabs whose
 * original space is gone land in the fallback space instead of being lost.
 */
export function resolveRestoreTabs(
  snapshot: SessionSnapshot,
  openUrls: Iterable<string>,
  availableSpaceIds: Iterable<string>,
  fallbackSpaceId: string | null,
): RestoreTabInput[] {
  const spaces = new Set(availableSpaceIds);
  const restored: RestoreTabInput[] = [];

  for (const tab of restorableTabs(snapshot, openUrls)) {
    const spaceId = spaces.has(tab.spaceId) ? tab.spaceId : fallbackSpaceId;
    if (!spaceId) continue;
    restored.push({ ...tab, title: tab.title || tab.url, spaceId, isActive: true });
  }

  return restored;
}

/**
 * Tabs from the snapshot that are not already open. Duplicate URLs inside the
 * snapshot collapse to one so a restore cannot recreate accidental duplicates.
 */
export function restorableTabs(snapshot: SessionSnapshot, openUrls: Iterable<string>): RestorableTab[] {
  const open = new Set(openUrls);
  const seen = new Set<string>();
  const pending: RestorableTab[] = [];

  for (const tab of snapshot.tabs) {
    if (!tab.url || tab.url === 'about:blank') continue;
    if (open.has(tab.url) || seen.has(tab.url)) continue;
    seen.add(tab.url);
    pending.push(tab);
  }

  return pending;
}
