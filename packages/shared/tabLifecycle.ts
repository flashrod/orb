/**
 * Tab hibernation policy, shared by the renderer's webview path and the
 * main-process TabManager. Pure functions only.
 */

import { isKeepalive, isSuspensionExempt } from './siteBehavior';

export type TabState = 'live' | 'throttled' | 'hibernated';
export interface MemoryGuardTab {
  id: string;
  isPinned: boolean;
  isAudible: boolean;
  inCall: boolean;
  lastActiveAt: number;
  state: TabState;
  /** Current URL, used to keep communication and editor tabs alive. */
  url?: string;
}

/** Background tabs idle for this long are hibernated. */
export const MEMORY_GUARD_IDLE_MS = 10 * 60 * 1000;

/** Hard ceiling on live (mounted) tabs. */
export const MEMORY_GUARD_MAX_LIVE_TABS = 20;

/**
 * A tab may only be hibernated when it is live, unprotected and idle.
 * Protected: pinned, audible, in a call, a keepalive site, or currently
 * focused by the user.
 */
export function shouldHibernate(
  tab: MemoryGuardTab,
  now: number,
  idleThresholdMs: number,
  activeTabId?: string | null,
): boolean {
  if (tab.state !== 'live') return false;
  if (isProtectedTab(tab)) return false;
  if (activeTabId && tab.id === activeTabId) return false;
  return now - tab.lastActiveAt > idleThresholdMs;
}

function isProtectedTab(tab: MemoryGuardTab): boolean {
  if (tab.isPinned || tab.isAudible || tab.inCall) return true;
  if (!tab.url) return false;
  return isKeepalive(tab.url) || isSuspensionExempt(tab.url);
}

/**
 * Picks the tabs to hibernate this tick.
 *
 * Idle tabs are always reclaimed. If the live-tab count still exceeds the cap,
 * the oldest unprotected tabs are reclaimed too, even when they are not idle
 * yet, so the browser stays inside its memory budget.
 */
export function selectTabsToHibernate(
  tabs: MemoryGuardTab[],
  now: number,
  idleThresholdMs: number,
  maxLiveTabs: number,
  activeTabId?: string | null,
): string[] {
  const liveTabs = tabs.filter((tab) => tab.state === 'live');
  const selected = new Set<string>();

  for (const tab of liveTabs) {
    if (shouldHibernate(tab, now, idleThresholdMs, activeTabId)) selected.add(tab.id);
  }

  const remainingLive = liveTabs.filter((tab) => !selected.has(tab.id)).length;
  if (remainingLive > maxLiveTabs) {
    const oldestFirst = [...liveTabs].sort((a, b) => a.lastActiveAt - b.lastActiveAt);
    let live = remainingLive;
    for (const tab of oldestFirst) {
      if (live <= maxLiveTabs) break;
      if (selected.has(tab.id)) continue;
      if (isProtectedTab(tab)) continue;
      if (activeTabId && tab.id === activeTabId) continue;
      selected.add(tab.id);
      live -= 1;
    }
  }

  return [...selected];
}
