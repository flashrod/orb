import { useEffect, useRef, type RefObject } from 'react';
import type { Tab } from '../stores/tabs';
import { useTabStore } from '../stores/tabs';
import type { TabStateSnapshot } from '../../shared/tabModel';

/**
 * The native-view engine is opt-in while it reaches parity with the webview
 * path. Enable it by launching with `ORB_NATIVE_TABS=1` (main appends
 * `?nativeTabs=1` to the renderer URL). Nothing is persisted, so a bad build
 * can never strand a profile in the experimental path.
 */
export function nativeTabsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('nativeTabs') === '1';
  } catch {
    return false;
  }
}

interface NativeTabBridgeOptions {
  enabled: boolean;
  tabs: Tab[];
  activeTabId: string | null;
  /** Resolves the profile partition a tab should run in. */
  profileForTab: (tab: Tab) => string;
  pageRef: RefObject<HTMLElement | null>;
  /** The two tabs shown side by side, when split view is open. */
  splitTabIds?: [string, string] | null;
  splitRatio?: number;
  /** False while an overlay covers the page area. */
  pageVisible: boolean;
  onLoadingChange?: (tabId: string, loading: boolean) => void;
  /** Last painted frame, sent when the native views are hidden. */
  onSnapshot?: (tabId: string, dataUrl: string) => void;
}

/**
 * Mirrors the renderer's tab store onto the main-process TabManager.
 *
 * The store stays the UI source of truth (order, spaces, pins, groups); the
 * main process owns the actual page views. Main reports back title, favicon,
 * URL and loading state, which are written into the same store so every
 * existing component keeps working.
 */
export function useNativeTabBridge({
  enabled,
  tabs,
  activeTabId,
  profileForTab,
  pageRef,
  splitTabIds,
  splitRatio = 0.5,
  pageVisible,
  onLoadingChange,
  onSnapshot,
}: NativeTabBridgeOptions): void {
  const openedIds = useRef(new Set<string>());
  const sentUrls = useRef(new Map<string, string>());
  const unloadedIds = useRef(new Set<string>());
  const profileForTabRef = useRef(profileForTab);
  profileForTabRef.current = profileForTab;
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  // Open/close/navigate to match the store.
  useEffect(() => {
    if (!enabled) return;
    const api = window.orbApi?.tabs;
    if (!api) return;

    const liveIds = new Set(tabs.map((tab) => tab.id));
    for (const id of [...openedIds.current]) {
      if (liveIds.has(id)) continue;
      openedIds.current.delete(id);
      sentUrls.current.delete(id);
      void api.close(id);
    }

    for (const tab of tabs) {
      if (tab.url === 'about:blank' || tab.isUnloaded) continue;
      if (openedIds.current.has(tab.id)) {
        if (sentUrls.current.get(tab.id) === tab.url) continue;
        sentUrls.current.set(tab.id, tab.url);
        void api.navigate(tab.id, tab.url);
        continue;
      }
      openedIds.current.add(tab.id);
      sentUrls.current.set(tab.id, tab.url);
      void api.open({
        id: tab.id,
        url: tab.url,
        spaceId: tab.spaceId,
        profileId: profileForTabRef.current(tab),
        isPinned: tab.isPinned,
        activate: tab.id === activeTabId,
      });
    }
  }, [enabled, tabs, activeTabId]);

  // Activation is separate so metadata updates never re-focus a view.
  useEffect(() => {
    if (!enabled || !activeTabId) return;
    if (!openedIds.current.has(activeTabId)) return;
    void window.orbApi?.tabs.activate(activeTabId);
  }, [enabled, activeTabId]);

  // Unloading a tab destroys its native view; the store keeps the tab itself.
  useEffect(() => {
    if (!enabled) return;
    const api = window.orbApi?.tabs;
    if (!api) return;
    for (const tab of tabs) {
      if (tab.isUnloaded) {
        if (unloadedIds.current.has(tab.id)) continue;
        unloadedIds.current.add(tab.id);
        void api.hibernate(tab.id);
      } else if (unloadedIds.current.delete(tab.id) && tab.id === activeTabId) {
        void api.activate(tab.id);
      }
    }
  }, [enabled, tabs, activeTabId]);

  // Main -> renderer page metadata.
  useEffect(() => {
    if (!enabled) return;
    const api = window.orbApi;
    if (!api) return;

    const subscription = api.on('orb:tabs-state', (payload) => {
      const snapshot = payload as TabStateSnapshot;
      const store = useTabStore.getState();
      for (const remote of snapshot.tabs) {
        const current = store.tabs.find((tab) => tab.id === remote.id);
        if (!current) continue;
        onLoadingChangeRef.current?.(remote.id, remote.isLoading);
        const patch: Partial<Tab> = {};
        if (remote.url && remote.url !== current.url && sentUrls.current.get(remote.id) !== remote.url) {
          patch.url = remote.url;
          sentUrls.current.set(remote.id, remote.url);
        }
        if (remote.title && remote.title !== current.title) patch.title = remote.title;
        if (remote.favicon && remote.favicon !== current.favicon) patch.favicon = remote.favicon;
        if (Object.keys(patch).length > 0) store.updateTab(remote.id, patch);
      }
    });

    const focusSubscription = api.on('orb:tab-focused', (payload) => {
      const focused = payload as { tabId?: unknown };
      if (typeof focused?.tabId !== 'string') return;
      if (!splitTabIds?.includes(focused.tabId)) return;
      useTabStore.getState().setActiveTab(focused.tabId);
    });

    const snapshotSubscription = api.on('orb:tab-snapshot', (payload) => {
      const snapshot = payload as { tabId: string; dataUrl: string };
      if (typeof snapshot?.tabId === 'string' && typeof snapshot.dataUrl === 'string') {
        onSnapshotRef.current?.(snapshot.tabId, snapshot.dataUrl);
      }
    });

    return () => {
      if (subscription) api.off(subscription);
      if (focusSubscription) api.off(focusSubscription);
      if (snapshotSubscription) api.off(snapshotSubscription);
    };
  }, [enabled, splitTabIds?.[0], splitTabIds?.[1]]);

  // Report the page rectangle the native views should occupy.
  useEffect(() => {
    if (!enabled) return;
    const element = pageRef.current;
    if (!element) return;
    const api = window.orbApi?.tabs;
    if (!api) return;

    const report = () => {
      const rect = element.getBoundingClientRect();
      const pageBounds = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
      const first = splitTabIds?.[0];
      const second = splitTabIds?.[1];
      if (!first || !second || !activeTabId || (activeTabId !== first && activeTabId !== second)) {
        void api.setBounds(pageBounds);
        return;
      }
      // Match the shell's split grid: two panes with an 8px draggable divider.
      const gap = 8;
      const available = Math.max(0, rect.width - gap);
      const left = { x: rect.left, y: rect.top, width: available * splitRatio, height: rect.height };
      const right = {
        x: rect.left + available * splitRatio + gap,
        y: rect.top,
        width: available * (1 - splitRatio),
        height: rect.height,
      };
      const activeIsFirst = activeTabId === first;
      void api.setBounds(
        activeIsFirst ? left : right,
        { id: activeIsFirst ? second : first, bounds: activeIsFirst ? right : left },
      );
    };
    report();

    const observer = new ResizeObserver(report);
    observer.observe(element);
    window.addEventListener('resize', report);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', report);
    };
  }, [enabled, pageRef, splitTabIds?.[0], splitTabIds?.[1], splitRatio, activeTabId]);

  // Native views sit above the shell, so overlays must hide them.
  useEffect(() => {
    if (!enabled) return;
    void window.orbApi?.tabs.setPageVisible(pageVisible);
  }, [enabled, pageVisible]);

  // The main process owns hibernation for native tabs.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      void window.orbApi?.tabs.applyMemoryBudget();
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [enabled]);
}
