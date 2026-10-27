/**
 * Tab hibernation policy, shared by the renderer's webview path and the
 * main-process TabManager. Pure functions only.
 *
 * Protection is behavior-based, not site-based: a tab survives only while it is
 * doing something a reload would interrupt (playing audio, in a call, holding
 * typed input, showing notifications) or because the user asked for it.
 */

import { isNeverHibernate } from './siteBehavior';

export type TabState = 'live' | 'throttled' | 'hibernated';

export interface MemoryGuardTab {
  id: string;
  isPinned: boolean;
  isAudible: boolean;
  /** The tab is in an active call or meeting. */
  inCall: boolean;
  /** A form field holds typed input that a reload would discard. */
  hasUnsavedInput: boolean;
  /** The site has been granted notification permission. */
  hasNotificationPermission: boolean;
  lastActiveAt: number;
  state: TabState;
  url?: string;
}

export interface HibernationOptions {
  /** Domains the user has pinned to "never hibernate". */
  neverHibernate?: readonly string[];
}

/** Background tabs idle for this long are hibernated. */
export const MEMORY_GUARD_IDLE_MS = 10 * 60 * 1000;

/** Hard ceiling on live (mounted) tabs. */
export const MEMORY_GUARD_MAX_LIVE_TABS = 20;

/**
 * A tab may only be hibernated when it is live, unprotected and idle.
 * Protected: pinned, audible, in a call, holding typed input, notifications
 * granted, on the user's never-hibernate list, or currently focused.
 */
export function shouldHibernate(
  tab: MemoryGuardTab,
  now: number,
  idleThresholdMs: number,
  activeTabId?: string | null,
  options: HibernationOptions = {},
): boolean {
  if (tab.state !== 'live') return false;
  if (isProtectedTab(tab, options)) return false;
  if (activeTabId && tab.id === activeTabId) return false;
  return now - tab.lastActiveAt > idleThresholdMs;
}

function isProtectedTab(tab: MemoryGuardTab, options: HibernationOptions): boolean {
  if (tab.isPinned || tab.isAudible || tab.inCall) return true;
  if (tab.hasUnsavedInput || tab.hasNotificationPermission) return true;
  if (!tab.url) return false;
  return isNeverHibernate(tab.url, options.neverHibernate ?? []);
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
  options: HibernationOptions = {},
): string[] {
  const liveTabs = tabs.filter((tab) => tab.state === 'live');
  const selected = new Set<string>();

  for (const tab of liveTabs) {
    if (shouldHibernate(tab, now, idleThresholdMs, activeTabId, options)) selected.add(tab.id);
  }

  const remainingLive = liveTabs.filter((tab) => !selected.has(tab.id)).length;
  if (remainingLive > maxLiveTabs) {
    const oldestFirst = [...liveTabs].sort((a, b) => a.lastActiveAt - b.lastActiveAt);
    let live = remainingLive;
    for (const tab of oldestFirst) {
      if (live <= maxLiveTabs) break;
      if (selected.has(tab.id)) continue;
      if (isProtectedTab(tab, options)) continue;
      if (activeTabId && tab.id === activeTabId) continue;
      selected.add(tab.id);
      live -= 1;
    }
  }

  return [...selected];
}
