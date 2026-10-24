import { useSpaceStore } from '../stores/spaces';
import { useTabStore } from '../stores/tabs';
import {
  parseSessionSnapshot,
  resolveRestoreTabs,
  restorableTabs,
  SESSION_SNAPSHOT_KEY,
  type SessionSnapshot,
} from './sessionSnapshot';

function readSnapshot(): SessionSnapshot | null {
  try {
    return parseSessionSnapshot(localStorage.getItem(SESSION_SNAPSHOT_KEY));
  } catch {
    return null;
  }
}

/** How many tabs from the last session are not currently open. */
export function countRestorableTabs(): number {
  const snapshot = readSnapshot();
  if (!snapshot) return 0;
  return restorableTabs(snapshot, useTabStore.getState().tabs.map((tab) => tab.url)).length;
}

/**
 * Reopens the last session's missing tabs in their original spaces. Returns
 * how many tabs were added; existing tabs are never closed or duplicated.
 */
export function restoreLastSession(): number {
  const snapshot = readSnapshot();
  if (!snapshot) return 0;

  const tabState = useTabStore.getState();
  const spaceState = useSpaceStore.getState();
  const fallbackSpaceId = spaceState.activeSpaceId || spaceState.spaces[0]?.id || null;
  const pending = resolveRestoreTabs(
    snapshot,
    tabState.tabs.map((tab) => tab.url),
    spaceState.spaces.map((space) => space.id),
    fallbackSpaceId,
  );

  for (const tab of pending) {
    tabState.addTab(tab);
  }

  return pending.length;
}
