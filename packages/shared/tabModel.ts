/**
 * Tab model shared by the main-process TabManager and the renderer.
 * Keep this file free of Electron imports so it can be unit-tested directly.
 */

export type TabLifecycle = 'live' | 'throttled' | 'hibernated';

export interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TabRecord {
  id: string;
  spaceId: string;
  profileId: string;
  url: string;
  title: string;
  favicon: string;
  isPinned: boolean;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isAudible: boolean;
  /** The tab is in an active call or meeting. */
  inCall: boolean;
  /** A form field holds typed input that a reload would discard. */
  hasUnsavedInput: boolean;
  /** The site has been granted notification permission. */
  hasNotificationPermission: boolean;
  lifecycle: TabLifecycle;
  lastActiveAt: number;
  createdAt: number;
}

export interface TabStateSnapshot {
  tabs: TabRecord[];
  activeTabId: string | null;
}

export interface TabOpenInput {
  url: string;
  spaceId: string;
  profileId: string;
  /**
   * Lets the renderer own tab ids so its persisted store and the main-process
   * manager agree on identity. Omitted ids are generated.
   */
  id?: string;
  isPinned?: boolean;
  /** Defaults to true: a newly opened tab becomes the active tab. */
  activate?: boolean;
}

/** Rounds and clamps a page rectangle so a native view can never get bad bounds. */
export function clampBounds(bounds: ViewBounds): ViewBounds {
  const clamp = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  return {
    x: clamp(bounds.x),
    y: clamp(bounds.y),
    width: clamp(bounds.width),
    height: clamp(bounds.height),
  };
}

/**
 * Turns address-bar input into a URL. Explicit schemes (including about: and
 * orb:) pass through; bare hosts get https.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'about:blank';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('localhost') || /^\d{1,3}(\.\d{1,3}){3}/.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

/**
 * Picks the tab that should become active after `closingId` is closed:
 * the next tab to the right, then the last remaining one.
 */
export function nextActiveAfterClose(
  tabs: readonly TabRecord[],
  closingId: string,
  activeTabId: string | null,
): string | null {
  if (activeTabId !== closingId) return activeTabId;
  const index = tabs.findIndex((tab) => tab.id === closingId);
  const remaining = tabs.filter((tab) => tab.id !== closingId);
  if (remaining.length === 0) return null;
  const nextIndex = Math.min(Math.max(index, 0), remaining.length - 1);
  return remaining[nextIndex].id;
}
