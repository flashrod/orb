import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSpaceStore } from './stores/spaces';
import { useProfileStore } from './stores/profiles';
import { useBrowserPreferencesStore } from './stores/preferences';
import { resolveSpaceProfile } from './lib/profiles';
import { useTabStore } from './stores/tabs';
import type { Tab } from './stores/tabs';
import { useSplitViewStore } from './stores/splitView';
import TabBar from './components/TabBar';
import CommandBar from './components/CommandBar';
import BrowserToolbar from './components/BrowserToolbar';
import WebView from './components/WebView';
import VerticalTabPanel from './components/VerticalTabPanel';
import Settings from './components/Settings';
import Onboarding, { type OnboardingChoice } from './components/Onboarding';
import StartupSessionPrompt from './components/StartupSessionPrompt';
import SplitViewPicker from './components/SplitViewPicker';
import { useAppearanceStore } from './stores/appearance';
import StartPage from './components/StartPage';
import GlanceView from './components/GlanceView';
import { useBoostStore } from './stores/boosts';
import BookmarksBar from './components/BookmarksBar';
import PermissionPrompt from './components/PermissionPrompt';
import DownloadsPanel from './components/DownloadsPanel';
import HistoryPage from './components/HistoryPage';
import { getTabRailPresentation, matchesTabRailShortcut } from './lib/tabRail';
import { bindMainEvents } from './lib/mainEvents';
import { nativeTabsEnabled, useNativeTabBridge } from './lib/nativeTabs';
import { captureSession, SESSION_SNAPSHOT_KEY } from './lib/sessionSnapshot';
import { stripTrackingParams } from '../shared/privacy';
import { isMutedSite, tidyTitle } from '../shared/siteBehavior';
import { pdfFilename } from '../shared/pdf';
import { canUsePictureInPicture } from '../shared/media';
import { boostMatchesDomain } from '../shared/boosts';
import FindBar from './components/FindBar';
import { useAnyShellOverlay } from './stores/shellOverlay';
import {
  MEMORY_GUARD_IDLE_MS,
  MEMORY_GUARD_MAX_LIVE_TABS,
  selectTabsToHibernate,
  type MemoryGuardTab,
} from './lib/memoryGuard';
import { ArrowsLeftRight, X, List, NavigationArrow } from '@phosphor-icons/react';
import { normalizeGlanceUrl } from './lib/glance';
import { nextProfileId, nextSpaceIndex } from './lib/spaceNavigation';
type DownloadItem = {
  id: string;
  url: string;
  filePath: string | null;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  startedAt: number;
  completedAt: number | null;
};

const hasMacTrafficLights = /Mac/i.test(navigator.platform || navigator.userAgent);

// The WebContentsView engine is opt-in until it reaches parity.
const NATIVE_TABS = nativeTabsEnabled();

export default function App() {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // A fresh install opens on the tour. Existing profiles have already
  // completed it through the store migration; ?welcome=1 is a dev escape hatch.
  const [welcomeOpen, setWelcomeOpen] = useState(() =>
    !useAppearanceStore.getState().onboardingComplete ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('welcome')),
  );
  const [settingsSection, setSettingsSection] = useState<'appearance' | 'browser' | 'privacy' | 'boosts' | 'toolbar' | 'profiles'>('appearance');
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerNotice, setPickerNotice] = useState('');
  const [glanceCandidate, setGlanceCandidate] = useState<{ url: string; tabId: string } | null>(null);
  const [glanceUrl, setGlanceUrl] = useState<string | null>(null);
  const [resizingSplit, setResizingSplit] = useState(false);
  const [splitPickerTabId, setSplitPickerTabId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Tracks which tabs have a WebView mounted. Once mounted, a tab stays mounted
  // even when inactive so switching tabs never reloads the page.
  const [mountedTabIds, setMountedTabIds] = useState<Set<string>>(new Set());
  // Per-tab loading state, used for the thin progress bar in the toolbar
  const [tabLoadingStates, setTabLoadingStates] = useState<Record<string, boolean>>({});
  // Last painted frame per native tab, shown while shell UI covers the page
  // or a hibernated tab spins its view back up.
  const [pageSnapshots, setPageSnapshots] = useState<Record<string, string>>({});
  // Compact rail peek: temporarily widen the rail without leaving compact mode.
  const [railPeek, setRailPeek] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResult, setFindResult] = useState<{ active: number; matches: number } | null>(null);
  // Downloads panel state
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [currentDownloadPath, setCurrentDownloadPath] = useState('');
  // Memory guard: last activity per tab, kept in a ref so the guard timer reads
  // fresh values without being torn down on every tab switch.
  const tabLastActiveAtRef = useRef<Record<string, number>>({});
  const mountedTabIdsRef = useRef<Set<string>>(new Set());
  const { spaces, activeSpaceId, addSpace, setActiveSpace } = useSpaceStore();
  const profiles = useProfileStore((state) => state.profiles);
  const { activeTabId, tabs, groups, setActiveTab, updateTab, loadTab } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const splitTabIds = useSplitViewStore((state) => state.tabIds);
  const splitRatio = useSplitViewStore((state) => state.ratio);
  const activePane = useSplitViewStore((state) => state.activePane);
  const focusSplitPane = useSplitViewStore((state) => state.focusPane);
  const replaceSplitTab = useSplitViewStore((state) => state.replaceActiveTab);
  const setSplitRatio = useSplitViewStore((state) => state.setRatio);
  const closeSplit = useSplitViewStore((state) => state.close);
  const swapSplit = useSplitViewStore((state) => state.swap);
  const openSplit = useSplitViewStore((state) => state.open);
  const mutedSites = useBrowserPreferencesStore((state) => state.mutedSites);
  const { theme, accent, density, motion, tabLayout, bookmarksBarVisible, compactSideTabs, showStartPage, showTabStrip, showNavigation, compactMode, customColors, setTabLayout, setCompactMode, setShowTabStrip, setShowNavigation, setCompactSideTabs } = useAppearanceStore();

  const webviewRefs = useRef<Record<string, any>>({});
  // Tabs whose site-wide mute has already been pushed to the native view.
  const appliedMuteRef = useRef<Map<string, string>>(new Map());
  const splitAreaRef = useRef<HTMLDivElement | null>(null);
  const pageAreaRef = useRef<HTMLDivElement | null>(null);
  const getActiveWebView = useCallback(() => {
    const selectedId = useTabStore.getState().activeTabId;
    return selectedId ? webviewRefs.current[selectedId] : null;
  }, []);

  const openFind = useCallback(() => {
    const { tabs: allTabs, activeTabId: currentTabId } = useTabStore.getState();
    const current = allTabs.find((tab) => tab.id === currentTabId);
    if (current && current.url !== 'about:blank') setFindOpen(true);
  }, []);

  const printActive = useCallback(() => {
    const { tabs: allTabs, activeTabId: currentTabId } = useTabStore.getState();
    const current = allTabs.find((tab) => tab.id === currentTabId);
    if (!current || current.url === 'about:blank') return;
    if (NATIVE_TABS) {
      void window.orbApi?.tabs.print(current.id);
      return;
    }
    webviewRefs.current[current.id]?.print();
  }, []);

  const exportActivePdf = useCallback(async () => {
    const { tabs: allTabs, activeTabId: currentTabId } = useTabStore.getState();
    const current = allTabs.find((tab) => tab.id === currentTabId);
    if (!current || current.url === 'about:blank') return;

    try {
      const data = NATIVE_TABS
        ? await window.orbApi?.tabs.printToPDF(current.id)
        : await webviewRefs.current[current.id]?.printToPDF({ printBackground: true, preferCSSPageSize: true });
      if (!data || data.byteLength === 0) throw new Error('Nothing to export yet.');

      const result = await window.orbApi?.savePdf(data, pdfFilename(current.title, current.url));
      if (result?.saved) setPickerNotice(`Saved PDF to ${result.path}`);
      else if (result?.error) throw new Error(result.error);
    } catch (error) {
      setPickerNotice(error instanceof Error ? error.message : 'Could not export this page.');
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    const { tabs: allTabs, activeTabId: currentTabId } = useTabStore.getState();
    const current = allTabs.find((tab) => tab.id === currentTabId);
    if (!current || current.url === 'about:blank') return;
    if (!canUsePictureInPicture(current.url)) {
      setPickerNotice('Picture-in-picture is disabled for this site.');
      return;
    }

    try {
      const result = NATIVE_TABS
        ? await window.orbApi?.tabs.togglePictureInPicture(current.id)
        : await webviewRefs.current[current.id]?.togglePictureInPicture();
      if (!result) throw new Error('Could not reach the page.');
      if (!result.ok) setPickerNotice(result.error || 'Could not start picture-in-picture.');
    } catch (error) {
      setPickerNotice(error instanceof Error ? error.message : 'Could not start picture-in-picture.');
    }
  }, []);

  const toggleMediaPlayback = useCallback(async () => {
    const { tabs: allTabs, activeTabId: currentTabId } = useTabStore.getState();
    const current = allTabs.find((tab) => tab.id === currentTabId);
    if (!current || current.url === 'about:blank') return;

    try {
      const result = NATIVE_TABS
        ? await window.orbApi?.tabs.toggleMediaPlayback(current.id)
        : await webviewRefs.current[current.id]?.toggleMediaPlayback();
      if (!result) throw new Error('Could not reach the page.');
      if (!result.ok) setPickerNotice(result.error || 'Could not control media on this page.');
    } catch (error) {
      setPickerNotice(error instanceof Error ? error.message : 'Could not control media on this page.');
    }
  }, []);

  const finishOnboarding = useCallback((choice: OnboardingChoice) => {
    useBrowserPreferencesStore.getState().setDisplayName(choice.displayName);

    const spaceStore = useSpaceStore.getState();
    const current = spaceStore.spaces.find((space) => space.id === spaceStore.activeSpaceId) ?? spaceStore.spaces[0];
    const [firstSpace, ...rest] = choice.spaces.length > 0
      ? choice.spaces
      : [{ name: 'Personal', color: '#a0522d' }];

    let firstId = current?.id;
    if (current) {
      spaceStore.updateSpace(current.id, { name: firstSpace.name, color: firstSpace.color });
    } else {
      firstId = spaceStore.addSpace({ name: firstSpace.name, icon: 'globe', color: firstSpace.color, tabIds: [] });
    }
    for (const space of rest) {
      spaceStore.addSpace({ name: space.name, icon: 'globe', color: space.color, tabIds: [] });
    }
    if (firstId) spaceStore.setActiveSpace(firstId);

    useAppearanceStore.getState().completeOnboarding();
    setWelcomeOpen(false);
  }, []);

  const skipOnboarding = useCallback(() => {
    useAppearanceStore.getState().completeOnboarding();
    setWelcomeOpen(false);
  }, []);

  const replayOnboarding = useCallback(() => {
    useAppearanceStore.getState().replayOnboarding();
    setWelcomeOpen(true);
  }, []);

  const previewBoost = useCallback(async (boost: { domain: string; css: string; js: string }) => {    const { tabs: allTabs, activeTabId: currentTabId } = useTabStore.getState();
    const current = allTabs.find((tab) => tab.id === currentTabId);
    if (!current || current.url === 'about:blank') {
      setPickerNotice('Open a website before previewing a Boost.');
      return;
    }

    let host = '';
    try {
      host = new URL(current.url).hostname;
    } catch {
      setPickerNotice('This page does not support Boosts.');
      return;
    }
    if (!boostMatchesDomain(boost.domain, host)) {
      setPickerNotice(`Open a page on ${boost.domain} to preview this Boost.`);
      return;
    }

    try {
      if (NATIVE_TABS) {
        if (boost.css.trim()) await window.orbApi?.tabs.applyCss(current.id, boost.css);
        if (boost.js.trim()) await window.orbApi?.tabs.executeBoostJavaScript(current.id, boost.js);
      } else {
        const view = webviewRefs.current[current.id];
        if (boost.css.trim()) await view?.applyCSS(boost.css);
        if (boost.js.trim()) await view?.executeJavaScript(boost.js);
      }
      setPickerNotice(`Previewing the Boost for ${boost.domain}. Reload the page to reset it.`);
    } catch (error) {
      setPickerNotice(error instanceof Error ? error.message : 'Could not preview this Boost.');
    }
  }, []);

  const runFind = useCallback((text: string, forward: boolean, findNext: boolean) => {
    if (!text) return;
    const id = useTabStore.getState().activeTabId;
    if (NATIVE_TABS) {
      if (id) void window.orbApi?.tabs.findInPage(id, text, { forward, findNext });
      return;
    }
    getActiveWebView()?.findInPage(text, forward, findNext);
  }, [getActiveWebView]);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setFindQuery('');
    setFindResult(null);
    const id = useTabStore.getState().activeTabId;
    if (NATIVE_TABS) {
      if (id) void window.orbApi?.tabs.stopFindInPage(id, 'clearSelection');
      return;
    }
    getActiveWebView()?.stopFindInPage('clearSelection');
  }, [getActiveWebView]);

  // A new query is a fresh search; Enter/Shift+Enter step through matches.
  useEffect(() => {
    if (!findOpen) return;
    if (!findQuery) {
      setFindResult(null);
      return;
    }
    runFind(findQuery, true, false);
  }, [findOpen, findQuery, runFind]);

  // Drop frames for closed tabs so the map cannot grow without bound.
  useEffect(() => {
    const liveIds = new Set(tabs.map((tab) => tab.id));
    setPageSnapshots((previous) => {
      const entries = Object.entries(previous).filter(([id]) => liveIds.has(id));
      if (entries.length === Object.keys(previous).length) return previous;
      return Object.fromEntries(entries);
    });
  }, [tabs]);

  // The find bar belongs to the active tab; switching tabs closes it.
  useEffect(() => {
    if (!findOpen) return;
    setFindOpen(false);
    setFindQuery('');
    setFindResult(null);
  }, [activeTabId]);

  const navigateBack = useCallback(() => {
    const id = useTabStore.getState().activeTabId;
    if (NATIVE_TABS) { if (id) void window.orbApi?.tabs.back(id); return; }
    getActiveWebView()?.navigateBack();
  }, [getActiveWebView]);
  const navigateForward = useCallback(() => {
    const id = useTabStore.getState().activeTabId;
    if (NATIVE_TABS) { if (id) void window.orbApi?.tabs.forward(id); return; }
    getActiveWebView()?.navigateForward();
  }, [getActiveWebView]);
  const navigateReload = useCallback(() => {
    const id = useTabStore.getState().activeTabId;
    if (NATIVE_TABS) { if (id) void window.orbApi?.tabs.reload(id); return; }
    getActiveWebView()?.navigateReload();
  }, [getActiveWebView]);
  const navigateHardReload = useCallback(() => {
    const id = useTabStore.getState().activeTabId;
    if (NATIVE_TABS) { if (id) void window.orbApi?.tabs.reload(id, true); return; }
    getActiveWebView()?.navigateHardReload();
  }, [getActiveWebView]);

  const toggleTabMute = useCallback((tabId: string) => {
    const tab = useTabStore.getState().tabs.find((item) => item.id === tabId);
    if (!tab) return;
    const next = !tab.isMuted;
    useTabStore.getState().updateTab(tabId, { isMuted: next });
    void window.orbApi?.tabs.setMuted(tabId, next);
  }, []);

  const toggleSiteMute = useCallback((tabId: string) => {
    const state = useTabStore.getState();
    const tab = state.tabs.find((item) => item.id === tabId);
    if (!tab || !tab.url || tab.url === 'about:blank') return;
    let host = '';
    try {
      host = new URL(tab.url).hostname;
    } catch {
      return;
    }
    const preferences = useBrowserPreferencesStore.getState();
    const muted = isMutedSite(tab.url, preferences.mutedSites);
    if (muted) preferences.unmuteSite(host);
    else preferences.muteSite(host);

    for (const item of state.tabs) {
      if (!isMutedSite(item.url, [host])) continue;
      if (muted) appliedMuteRef.current.delete(item.id);
      else appliedMuteRef.current.set(item.id, item.url);
      void window.orbApi?.tabs.setMuted(item.id, !muted);
    }
  }, []);

  // Site mutes follow the tab as it navigates; a manual tab mute is untouched.
  useEffect(() => {
    if (!NATIVE_TABS) return;
    const api = window.orbApi?.tabs;
    if (!api || mutedSites.length === 0) return;
    for (const tab of tabs) {
      if (!tab.url || tab.url === 'about:blank' || !isMutedSite(tab.url, mutedSites)) continue;
      if (appliedMuteRef.current.get(tab.id) === tab.url) continue;
      appliedMuteRef.current.set(tab.id, tab.url);
      void api.setMuted(tab.id, true);
    }
  }, [tabs, mutedSites]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.accent = accent;
    root.dataset.density = density;
    root.dataset.motion = motion;
    for (const token of ['canvas', 'surface', 'elevated', 'sidebar', 'border', 'text', 'text-strong', 'text-muted', 'accent', 'accent-soft']) {
      root.style.removeProperty(`--orb-${token}`);
    }
    for (const [token, color] of Object.entries(customColors)) {
      if (color) root.style.setProperty(`--orb-${token}`, color);
    }
    if (customColors.accent) {
      root.style.setProperty('--orb-accent-soft', `color-mix(in srgb, ${customColors.accent} 14%, var(--orb-canvas))`);
    }
  }, [theme, accent, density, motion, customColors]);

  useEffect(() => {
    if (useSpaceStore.getState().spaces.length === 0) {
      addSpace({ name: 'Personal', icon: 'globe', color: '#a0522d', tabIds: [] });
    }
    const defaultSpaceId = useSpaceStore.getState().activeSpaceId || useSpaceStore.getState().spaces[0]?.id;
    if (defaultSpaceId && !useSpaceStore.getState().activeSpaceId) setActiveSpace(defaultSpaceId);
    if (useTabStore.getState().tabs.length === 0 && defaultSpaceId) {
      useTabStore.getState().addTab({
        spaceId: defaultSpaceId,
        url: 'about:blank',
        title: 'New Tab',
        favicon: '',
        isPinned: false,
        isActive: true,
      });
    }
  }, [addSpace, setActiveSpace]);

  useEffect(() => {
    if (!activeSpaceId || tabs.length === 0) return;
    const tabsInSpace = tabs.filter((tab) => tab.spaceId === activeSpaceId);
    if (tabsInSpace.length === 0) {
      useTabStore.getState().addTab({ spaceId: activeSpaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
    } else if (!tabsInSpace.some((tab) => tab.id === activeTabId)) {
      setActiveTab(tabsInSpace[tabsInSpace.length - 1].id);
    }
  }, [activeSpaceId, tabs, activeTabId, setActiveTab]);

  // Record last active time for memory guard
  useEffect(() => {
    if (activeTabId) {
      tabLastActiveAtRef.current[activeTabId] = Date.now();
    }
  }, [activeTabId]);

  // Keep a last-session snapshot independent of the live store so tabs can be
  // recovered after an unexpected exit. An empty session never overwrites it:
  // closing every tab should still leave something to restore.
  useEffect(() => {
    const saveSnapshot = () => {
      const state = useTabStore.getState();
      const snapshot = captureSession(state.tabs, state.groups, state.activeTabId);
      if (!snapshot) return;
      try {
        localStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(snapshot));
      } catch {
        // Storage full: the live store remains the primary copy.
      }
    };
    const timer = window.setTimeout(saveSnapshot, 800);
    window.addEventListener('beforeunload', saveSnapshot);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeunload', saveSnapshot);
    };
  }, [tabs, groups, activeTabId]);

  useEffect(() => {
    mountedTabIdsRef.current = mountedTabIds;
  }, [mountedTabIds]);

  // Lazily mount the active tab's WebView on first visit; keep it mounted
  // thereafter so switching tabs never reloads the page.
  useEffect(() => {
    if (!activeTabId) return;
    // Activating an unloaded tab wakes it again.
    const tab = useTabStore.getState().tabs.find((item) => item.id === activeTabId);
    if (tab?.isUnloaded) useTabStore.getState().loadTab(activeTabId);
    setMountedTabIds((prev) => {
      if (prev.has(activeTabId)) return prev;
      return new Set([...prev, activeTabId]);
    });
  }, [activeTabId]);

  // Clean up mounted set when a tab is removed
  useEffect(() => {
    setMountedTabIds((prev) => {
      const next = new Set(prev);
      tabs.forEach((tab) => { if (!next.has(tab.id)) next.delete(tab.id); });
      return next;
    });
  }, [tabs]);

  useEffect(() => {
    if (!splitTabIds) return;
    if (splitTabIds[0] === splitTabIds[1] || splitTabIds.some((id) => !tabs.some((tab) => tab.id === id))) {
      closeSplit();
      return;
    }
    if (activeTabId && splitTabIds.includes(activeTabId)) {
      focusSplitPane(splitTabIds[0] === activeTabId ? 0 : 1);
    } else if (activeTabId) {
      replaceSplitTab(activeTabId);
    }
  }, [splitTabIds, tabs, activeTabId, closeSplit, focusSplitPane, replaceSplitTab]);

  // A split pane cannot show a hibernated tab, so opening split view wakes it.
  useEffect(() => {
    if (!splitTabIds) return;
    const store = useTabStore.getState();
    for (const id of splitTabIds) {
      if (store.tabs.find((tab) => tab.id === id)?.isUnloaded) store.loadTab(id);
    }
  }, [splitTabIds?.[0], splitTabIds?.[1]]);

  useEffect(() => {
    if (!resizingSplit) return;
    const moveDivider = (event: PointerEvent) => {
      const bounds = splitAreaRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width <= 0) return;
      setSplitRatio((event.clientX - bounds.left) / bounds.width);
    };
    const stopDivider = () => setResizingSplit(false);
    window.addEventListener('pointermove', moveDivider);
    window.addEventListener('pointerup', stopDivider, { once: true });
    return () => {
      window.removeEventListener('pointermove', moveDivider);
      window.removeEventListener('pointerup', stopDivider);
    };
  }, [resizingSplit, setSplitRatio]);

  // Closing the final tab minimizes the window. Recreate the next tab when the
  // user brings Orb back, matching the macOS browser workflow without quitting.
  useEffect(() => {
    const restoreTabIfNeeded = () => {
      if (useTabStore.getState().tabs.length > 0) return;
      const spaceStore = useSpaceStore.getState();
      let targetSpaceId = spaceStore.activeSpaceId || spaceStore.spaces[0]?.id;
      if (!targetSpaceId) {
        spaceStore.addSpace({ name: 'Personal', icon: 'globe', color: '#a0522d', tabIds: [] });
        targetSpaceId = useSpaceStore.getState().activeSpaceId || useSpaceStore.getState().spaces[0]?.id;
      }
      if (!targetSpaceId) return;
      useTabStore.getState().addTab({ spaceId: targetSpaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
    };
    // A fresh session can legitimately have no tabs at mount; never leave a
    // blank window waiting for a focus event that already happened.
    restoreTabIfNeeded();
    window.addEventListener('focus', restoreTabIfNeeded);
    return () => window.removeEventListener('focus', restoreTabIfNeeded);
  }, []);

  const openInNewTab = useCallback((url: string) => {
    const spaceId = useSpaceStore.getState().activeSpaceId || useSpaceStore.getState().spaces[0]?.id;
    if (!spaceId) return;
    useTabStore.getState().addTab({ spaceId, url, title: '', favicon: '', isPinned: false, isActive: true });
  }, []);

  const handleNavigate = useCallback((url: string) => {
    setHistoryOpen(false);
    url = stripTrackingParams(url);
    let targetTabId = useTabStore.getState().activeTabId;
    if (!targetTabId) {
      const spaceId = useSpaceStore.getState().activeSpaceId || useSpaceStore.getState().spaces[0]?.id;
      if (!spaceId) return;
      useTabStore.getState().addTab({ spaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
      targetTabId = useTabStore.getState().activeTabId;
    }
    if (targetTabId) useTabStore.getState().updateTab(targetTabId, { url });
  }, []);

  // --- Element picker ---

  const handlePickElement = useCallback(async () => {
    if (!activeTab || activeTab.url === 'about:blank' || pickerBusy) return;
    let hostname = '';
    try {
      const url = new URL(activeTab.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('This page does not support Boosts.');
      hostname = url.hostname.toLowerCase();
    } catch {
      setPickerNotice('Open a website before starting the element picker.');
      return;
    }

    setPickerBusy(true);
    setPickerNotice('Move over an element and click to create a hide rule. Press Esc to cancel.');
    try {
      const selection = NATIVE_TABS
        ? await window.orbApi?.tabs.pickElement(activeTab.id)
        : await getActiveWebView()?.pickElement();
      if (!selection) {
        setPickerNotice('Element picker closed.');
        return;
      }
      const boosts = useBoostStore.getState();
      await boosts.loadBoosts();
      const existing = useBoostStore.getState().getBoostForDomain(hostname);
      const rule = `${selection.selector} {\n  display: none !important;\n}`;
      if (existing) {
        const css = existing.css.trim() ? `${existing.css.trimEnd()}\n\n${rule}` : rule;
        await useBoostStore.getState().updateBoost(existing.id, { css });
      } else {
        await useBoostStore.getState().addBoost({ domain: hostname, css: rule, js: '', enabled: true });
      }
      const error = useBoostStore.getState().error;
      if (error) throw new Error(error);
      if (NATIVE_TABS) await window.orbApi?.tabs.applyCss(activeTab.id, rule);
      else await getActiveWebView()?.applyCSS(rule);
      setPickerNotice(`Saved and hid “${selection.label || selection.selector}” on ${hostname}.`);
    } catch (error) {
      setPickerNotice(error instanceof Error ? error.message : 'Could not save this Boost.');
    } finally {
      setPickerBusy(false);
    }
  }, [activeTab, pickerBusy, getActiveWebView]);

  // --- Tab navigation shortcut handlers ---

  const spaceTabsFor = useCallback((spaceId: string) => {
    return useTabStore.getState().tabs
      .filter((tab) => tab.spaceId === spaceId)
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, []);

  const handleCloseActiveTab = useCallback(() => {
    const state = useTabStore.getState();
    const id = state.activeTabId;
    if (!id) return;
    state.removeTab(id);
  }, []);

  const handleActivateTabByOffset = useCallback((offset: number) => {
    const state = useTabStore.getState();
    const currentId = state.activeTabId;
    if (!currentId) return;
    const current = state.tabs.find((tab) => tab.id === currentId);
    if (!current) return;
    const siblings = spaceTabsFor(current.spaceId);
    const index = siblings.findIndex((tab) => tab.id === currentId);
    if (index < 0) return;
    const nextIndex = (index + offset + siblings.length) % siblings.length;
    useTabStore.getState().setActiveTab(siblings[nextIndex].id);
  }, [spaceTabsFor]);

  const handleGoToTabIndex = useCallback((zeroBasedIndex: number) => {
    const state = useTabStore.getState();
    const currentId = state.activeTabId;
    if (!currentId) return;
    const current = state.tabs.find((tab) => tab.id === currentId);
    if (!current) return;
    const siblings = spaceTabsFor(current.spaceId);
    if (zeroBasedIndex < 0 || zeroBasedIndex >= siblings.length) return;
    useTabStore.getState().setActiveTab(siblings[zeroBasedIndex].id);
  }, [spaceTabsFor]);

  const handleTogglePinActiveTab = useCallback(() => {
    const state = useTabStore.getState();
    const id = state.activeTabId;
    if (!id) return;
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) return;
    state.updateTab(id, { isPinned: !tab.isPinned });
  }, []);

  const handleToggleMuteActiveTab = useCallback(() => {
    const state = useTabStore.getState();
    const id = state.activeTabId;
    if (!id) return;
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) return;
    toggleTabMute(id);
  }, [toggleTabMute]);

  const handleDuplicateActiveTab = useCallback(() => {
    const state = useTabStore.getState();
    const tab = state.tabs.find((t) => t.id === state.activeTabId);
    if (!tab || tab.url === 'about:blank') return;
    const spaceId = tab.spaceId;
    state.addTab({ spaceId, url: tab.url, title: tab.title, favicon: tab.favicon, isPinned: false, isActive: true });
  }, []);

  const handleHibernateActiveTab = useCallback(() => {
    const id = useTabStore.getState().activeTabId;
    if (!id) return;
    void window.orbApi?.tabs.hibernate(id);
  }, []);

  const handleHibernateOtherTabs = useCallback(() => {
    const state = useTabStore.getState();
    const id = state.activeTabId;
    if (!id) return;
    for (const tab of state.tabs) {
      if (tab.id === id) continue;
      void window.orbApi?.tabs.hibernate(tab.id);
    }
  }, []);

  // --- Space navigation shortcut handlers ---

  const handleSwitchSpaceByIndex = useCallback((zeroBasedIndex: number) => {
    const store = useSpaceStore.getState();
    const space = store.spaces[zeroBasedIndex];
    if (space) store.setActiveSpace(space.id);
  }, []);

  const handleSwitchSpaceByOffset = useCallback((offset: number) => {
    const store = useSpaceStore.getState();
    const { spaces, activeSpaceId: currentSpaceId } = store;
    if (spaces.length === 0) return;
    const index = spaces.findIndex((space) => space.id === currentSpaceId);
    const nextIndex = nextSpaceIndex(index, spaces.length, offset);
    if (nextIndex >= 0) store.setActiveSpace(spaces[nextIndex].id);
  }, []);

  const handleCycleSpaceProfile = useCallback(() => {
    const spaceStore = useSpaceStore.getState();
    const { profiles } = useProfileStore.getState();
    const space = spaceStore.spaces.find((item) => item.id === spaceStore.activeSpaceId);
    if (!space) return;
    const next = nextProfileId(profiles.map((profile) => profile.id), space.profileId);
    if (!next || next === space.profileId) return;
    spaceStore.updateSpace(space.id, { profileId: next });
  }, []);

  // --- View shortcut handlers ---

  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    const id = useTabStore.getState().activeTabId;
    if (NATIVE_TABS) { if (id) void window.orbApi?.tabs.zoom(id, direction); return; }
    getActiveWebView()?.zoom(direction);
  }, [getActiveWebView]);

  const handleToggleSidebar = useCallback(() => {
    const appearance = useAppearanceStore.getState();
    appearance.setShowTabStrip(!appearance.showTabStrip);
  }, []);

  // --- Split view shortcut handlers ---

  const handleSplitOpen = useCallback(() => {
    const state = useTabStore.getState();
    const id = state.activeTabId;
    if (!id) return;
    openSplit([id, id]);
  }, [openSplit]);

  const handleSplitSwap = useCallback(() => {
    if (!splitTabIds) return;
    swapSplit();
  }, [splitTabIds, swapSplit]);

  const handleSplitClose = useCallback(() => {
    if (!splitTabIds) return;
    closeSplit();
  }, [splitTabIds, closeSplit]);

  // --- Tools shortcut handlers ---

  const handleDevtools = useCallback(() => {
    void window.orbApi?.toggleDevTools();
  }, []);

  const handleCopyUrl = useCallback(() => {
    const tab = useTabStore.getState().tabs.find((t) => t.id === useTabStore.getState().activeTabId);
    if (!tab || tab.url === 'about:blank') return;
    void navigator.clipboard.writeText(tab.url);
  }, []);

  const handleDownloads = useCallback(() => {
    setDownloadsOpen((open) => !open);
  }, []);

  const handlePickElementShortcut = useCallback(() => {
    handlePickElement();
  }, [handlePickElement]);

  // --- Privacy shortcut handlers ---

  const handleToggleBlocker = useCallback(async () => {
    const status = await window.orbApi?.getAdBlockerStatus?.();
    void window.orbApi?.toggleAdBlocker(status?.enabled !== true);
  }, []);

  const handleToggleHttpsOnly = useCallback(async () => {
    const status = await window.orbApi?.getHttpsOnlyStatus?.();
    void window.orbApi?.toggleHttpsOnly(status?.httpsOnlyEnabled !== true);
  }, []);


  const handleShortcut = useCallback((e: Event) => {
    if (welcomeOpen) return;
    const customEvent = e as CustomEvent<{ action: string; params?: Record<string, string | number> }>;
    const { action, params } = customEvent.detail;
    if (action === 'new-tab') window.dispatchEvent(new CustomEvent('orb:new-tab'));
    else if (action === 'new-space') window.dispatchEvent(new CustomEvent('orb:new-space'));
    else if (action === 'command-bar') setCommandBarOpen(true);
    else if (action === 'find') openFind();
    else if (action === 'history') setHistoryOpen((open) => !open);
    else if (action === 'print') printActive();
    else if (action === 'save-pdf') void exportActivePdf();
    else if (action === 'toggle-pip') void togglePictureInPicture();
    else if (action === 'media-play-pause') void toggleMediaPlayback();
    else if (action === 'focus-address') {
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Search or enter address"]')?.focus());
    }
    else if (action === 'toggle-compact') {
      useAppearanceStore.getState().setCompactMode(!useAppearanceStore.getState().compactMode);
    }
    else if (action === 'settings') {
      setSettingsSection('appearance');
      setSettingsOpen(true);
    }
    else if (action === 'default-browser') {
      setSettingsSection('browser');
      setSettingsOpen(true);
    }
    else if (action === 'show-welcome') {
      replayOnboarding();
    }
    else if (action === 'close-overlays') {
      setCommandBarOpen(false);
      setSettingsOpen(false);
    }
    else if (action === 'toggle-fullscreen') {
      void window.orbApi?.toggleFullscreen();
    }
    else if (action === 'nav.back') {
      navigateBack();
    }
    else if (action === 'nav.forward') {
      navigateForward();
    }
    else if (action === 'nav.reload') {
      navigateReload();
    }
    else if (action === 'nav.hard-reload') {
      navigateHardReload();
    }
    else if (action === 'tab.close') {
      handleCloseActiveTab();
    }
    else if (action === 'tab.next') {
      handleActivateTabByOffset(1);
    }
    else if (action === 'tab.previous') {
      handleActivateTabByOffset(-1);
    }
    else if (action === 'tab.go-to') {
      const index = typeof params?.index === 'number' ? params.index : 1;
      handleGoToTabIndex(index - 1);
    }
    else if (action === 'tab.go-to-last') {
      const state = useTabStore.getState();
      const currentId = state.activeTabId;
      if (!currentId) return;
      const current = state.tabs.find((tab) => tab.id === currentId);
      if (!current) return;
      const siblings = spaceTabsFor(current.spaceId);
      if (siblings.length > 0) useTabStore.getState().setActiveTab(siblings[siblings.length - 1].id);
    }
    else if (action === 'tab.pin') {
      handleTogglePinActiveTab();
    }
    else if (action === 'tab.mute') {
      handleToggleMuteActiveTab();
    }
    else if (action === 'tab.duplicate') {
      handleDuplicateActiveTab();
    }
    else if (action === 'tab.hibernate') {
      handleHibernateActiveTab();
    }
    else if (action === 'tab.hibernate-others') {
      handleHibernateOtherTabs();
    }
    else if (action === 'space.switch') {
      const index = typeof params?.index === 'number' ? params.index : 1;
      handleSwitchSpaceByIndex(index - 1);
    }
    else if (action === 'space.next') {
      handleSwitchSpaceByOffset(1);
    }
    else if (action === 'space.previous') {
      handleSwitchSpaceByOffset(-1);
    }
    else if (action === 'space.switch-profile') {
      handleCycleSpaceProfile();
    }
    else if (action === 'view.zoom-in') {
      handleZoom('in');
    }
    else if (action === 'view.zoom-out') {
      handleZoom('out');
    }
    else if (action === 'view.zoom-reset') {
      handleZoom('reset');
    }
    else if (action === 'view.toggle-sidebar') {
      handleToggleSidebar();
    }
    else if (action === 'tools.devtools') {
      handleDevtools();
    }
    else if (action === 'tools.copy-url') {
      handleCopyUrl();
    }
    else if (action === 'tools.downloads') {
      handleDownloads();
    }
    else if (action === 'tools.element-picker') {
      handlePickElementShortcut();
    }
    else if (action === 'privacy.toggle-blocker') {
      void handleToggleBlocker();
    }
    else if (action === 'privacy.toggle-https-only') {
      void handleToggleHttpsOnly();
    }
    else if (action === 'app.toggle-devtools') {
      handleDevtools();
    }
    else if (action === 'split.open') {
      handleSplitOpen();
    }
    else if (action === 'split.swap') {
      handleSplitSwap();
    }
    else if (action === 'split.close') {
      handleSplitClose();
    }
  }, [
    welcomeOpen, openFind, printActive, exportActivePdf, togglePictureInPicture, toggleMediaPlayback, replayOnboarding,
    navigateBack, navigateForward, navigateReload, navigateHardReload,
    handleCloseActiveTab, handleActivateTabByOffset, handleGoToTabIndex, spaceTabsFor,
    handleTogglePinActiveTab, handleToggleMuteActiveTab, handleDuplicateActiveTab,
    handleHibernateActiveTab, handleHibernateOtherTabs,
    handleSwitchSpaceByIndex, handleSwitchSpaceByOffset, handleCycleSpaceProfile,
    handleZoom, handleToggleSidebar, handleDevtools, handleCopyUrl, handleDownloads, handlePickElementShortcut,
    handleToggleBlocker, handleToggleHttpsOnly, handleSplitOpen, handleSplitSwap, handleSplitClose,
  ]);

  useEffect(() => {
    // Initialize default space if none exist
    if (spaces.length === 0) {
      // Handled by store init; just ensure something exists
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (welcomeOpen) return;

      // Text-field guard: never steal typing from a focused input/textarea/
      // contenteditable unless the shortcut uses a command modifier
      // (Cmd/Ctrl/Alt), or is Escape or a function key.
      const active = document.activeElement;
      const isTextField =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable);
      if (
        isTextField &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.key !== 'Escape' &&
        !/^F([1-9]|1[0-2])$/i.test(e.key)
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('orb:new-tab'));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsSection('appearance');
        setSettingsOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        useAppearanceStore.getState().setCompactMode(false);
        useAppearanceStore.getState().setShowNavigation(true);
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Search or enter address"]')?.focus());
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        useAppearanceStore.getState().setCompactMode(!useAppearanceStore.getState().compactMode);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        openFind();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        printActive();
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        setHistoryOpen((open) => !open);
      }
      if (matchesTabRailShortcut(e) && useAppearanceStore.getState().tabLayout === 'split') {
        e.preventDefault();
        if (useAppearanceStore.getState().compactSideTabs) setRailPeek((peeked) => !peeked);
        else useAppearanceStore.getState().setCompactSideTabs(true);
      }
      if (e.key === 'Escape') {
        setCommandBarOpen(false);
        if (findOpen) closeFind();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle navigate events from CommandBar / AddressBar
    const handleNavigateEvent = (e: CustomEvent) => {
      const { url } = e.detail as { url: string };
      handleNavigate(url);
    };
    const handleNewTab = () => {
      const spaceStore = useSpaceStore.getState();
      const targetSpaceId = spaceStore.activeSpaceId || spaceStore.spaces[0]?.id;
      if (!targetSpaceId) return;

      useTabStore.getState().addTab({
        spaceId: targetSpaceId,
        url: 'about:blank',
        title: 'New Tab',
        favicon: '',
        isPinned: false,
        isActive: true,
      });
    };
    const handlePopupRequested = (url: string) => {
      url = stripTrackingParams(url);
      const spaceStore = useSpaceStore.getState();
      const targetSpaceId = spaceStore.activeSpaceId || spaceStore.spaces[0]?.id;
      if (!targetSpaceId) return;

      useTabStore.getState().addTab({
        spaceId: targetSpaceId,
        url,
        title: 'New Tab',
        favicon: '',
        isPinned: false,
        isActive: true,
      });
    };
    const handleNewSpace = () => {
      useSpaceStore.getState().addSpace({
        name: 'New Space',
        icon: 'globe',
        color: '#a0522d',
        tabIds: [],
      });
    };
    window.addEventListener('orb:navigate', handleNavigateEvent as EventListener);
    const handlePopupRequestedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string }>;
      handlePopupRequested(customEvent.detail.url);
    };
    window.addEventListener('orb:new-tab', handleNewTab);
    window.addEventListener('orb:new-space', handleNewSpace);
    window.addEventListener('orb:popup-requested', handlePopupRequestedEvent);



    const handleDownloadUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<DownloadItem>;
      const item = customEvent.detail;
      setDownloads((prev) => {
        const existing = prev.find((d) => d.id === item.id);
        if (existing && existing.state === item.state && existing.receivedBytes === item.receivedBytes) {
          return prev;
        }
        return [...prev.filter((d) => d.id !== item.id), item].sort((a, b) => b.startedAt - a.startedAt);
      });
    };
    const handlePathSet = async () => {
      const path = await window.orbApi?.getDownloadPath();
      if (typeof path === 'string') setCurrentDownloadPath(path);
    };
    window.addEventListener('orb:shortcut', handleShortcut as EventListener);
    window.addEventListener('orb:download-updated', handleDownloadUpdated as EventListener);

    // A link that launched the app arrives once the shell is listening.
    void window.orbApi?.takeLaunchUrl?.().then((url) => {
      if (url) window.dispatchEvent(new CustomEvent('orb:popup-requested', { detail: { url } }));
    }).catch(() => undefined);

    // Initialize download path
    handlePathSet();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('orb:navigate', handleNavigateEvent as EventListener);
      window.removeEventListener('orb:new-tab', handleNewTab);
      window.removeEventListener('orb:new-space', handleNewSpace);
      window.removeEventListener('orb:popup-requested', handlePopupRequestedEvent);
      window.removeEventListener('orb:download-updated', handleDownloadUpdated as EventListener);
      window.removeEventListener('orb:shortcut', handleShortcut as EventListener);
    };
  }, [spaces.length, commandBarOpen, handleNavigate, findOpen, closeFind, exportActivePdf, togglePictureInPicture, toggleMediaPlayback, replayOnboarding, welcomeOpen, handleShortcut]);

  // Forward main-process push events (popups, permissions, downloads, menu
  // shortcuts) into the DOM events the shell already listens for.
  useEffect(() => bindMainEvents(window.orbApi, window), []);

  // Sync keymap overrides to the main process so key events inside web pages
  // are matched against the user's current keymap without a round trip.
  useEffect(() => {
    const api = window.orbApi?.keymap;
    if (!api) return;
    const store = useBrowserPreferencesStore;
    let prev = store.getState().keymapOverrides;
    void api.setOverrides(prev);
    const sub = store.subscribe((state) => {
      const next = state.keymapOverrides;
      if (next === prev) return;
      prev = next;
      void api.setOverrides(next);
    });
    return () => sub();
  }, []);

  // Sync per-site passthrough rules to the main process so key events inside
  // web pages can be checked against site-specific bypass lists.
  useEffect(() => {
    const api = window.orbApi?.passthrough;
    if (!api) return;
    const store = useBrowserPreferencesStore;
    let prev = store.getState().passthroughRules;
    void api.setRules(prev);
    const sub = store.subscribe((state) => {
      const next = state.passthroughRules;
      if (next === prev) return;
      prev = next;
      void api.setRules(next);
    });
    return () => sub();
  }, []);

  // Memory guard: hibernate idle background tabs and keep the live-tab count
  // inside the budget. Reads stores and refs directly so the timer never needs
  // to be recreated when tab state changes.
  useEffect(() => {
    if (NATIVE_TABS) return;
    const reclaim = () => {
      const now = Date.now();
      const { tabs: allTabs, activeTabId: currentTabId } = useTabStore.getState();
      const candidates: MemoryGuardTab[] = allTabs
        .filter((tab) => mountedTabIdsRef.current.has(tab.id))
        .map((tab) => ({
          id: tab.id,
          isPinned: tab.isPinned,
          isAudible: Boolean(webviewRefs.current[tab.id]?.isAudible?.()),
          inCall: false,
          hasUnsavedInput: false,
          hasNotificationPermission: false,
          lastActiveAt: tabLastActiveAtRef.current[tab.id] ?? now,
          state: 'live',
          url: tab.url,
        }));

      const toHibernate = selectTabsToHibernate(
        candidates,
        now,
        MEMORY_GUARD_IDLE_MS,
        MEMORY_GUARD_MAX_LIVE_TABS,
        currentTabId,
        { neverHibernate: useBrowserPreferencesStore.getState().neverHibernate },
      );
      if (toHibernate.length === 0) return;

      setMountedTabIds((prev) => {
        const next = new Set(prev);
        for (const tabId of toHibernate) next.delete(tabId);
        return next;
      });
    };

    const timer = window.setInterval(reclaim, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const spaceTabs = activeSpaceId
    ? tabs.filter((t: { spaceId: string }) => t.spaceId === activeSpaceId)
    : [];
  // Unloaded tabs keep no live page, except the active one which shows a placeholder.
  const mountedTabs = spaceTabs.filter((tab) => mountedTabIds.has(tab.id) && (!tab.isUnloaded || tab.id === activeTabId));
  const activeTabLoading = activeTab ? tabLoadingStates[activeTab.id] || false : false;
  const activeSnapshot = activeTab ? pageSnapshots[activeTab.id] : undefined;
  const activeSpace = spaces.find((space) => space.id === activeSpaceId);
  const activeProfile = resolveSpaceProfile(activeSpace?.profileId, profiles);
  const overlayActive = useAnyShellOverlay();
  // In split view one pane can be a start page while the other holds a real
  // page; the native view must still be shown for its half.
  const splitHasLivePage = Boolean(splitTabIds?.some((id) => {
    const tab = tabs.find((item) => item.id === id);
    return Boolean(tab && tab.url !== 'about:blank');
  }));
  const nativePageVisible = Boolean(
    ((activeTab && activeTab.url !== 'about:blank') || splitHasLivePage) &&
    !overlayActive &&
    !commandBarOpen &&
    !settingsOpen &&
    !downloadsOpen &&
    !historyOpen &&
    !glanceUrl &&
    !splitPickerTabId &&
    !pickerBusy &&
    !welcomeOpen &&
    !resizingSplit,
  );

  // Fullscreen removes the macOS traffic lights, so the shell must drop the
  // 48px titlebar inset instead of leaving a dead strip above the page.
  useEffect(() => {
    const api = window.orbApi;
    if (!api?.on) return;
    void api.isFullscreen?.().then((value) => setIsFullscreen(Boolean(value)));
    const subscription = api.on('orb:fullscreen-changed', (payload) => {
      setIsFullscreen(Boolean((payload as { fullscreen?: boolean } | null)?.fullscreen));
    });
    return () => {
      if (subscription) api.off(subscription);
    };
  }, []);

  // Entering or leaving compact mode always starts from the collapsed rail.
  useEffect(() => {
    setRailPeek(false);
  }, [compactSideTabs]);

  // Switching tabs leaves the history page; it belongs to the shell, not a tab.
  useEffect(() => {
    setHistoryOpen(false);
  }, [activeTabId]);

  const nativeSplitIds: [string, string] | null = (() => {
    if (!splitTabIds || splitTabIds[0] === splitTabIds[1]) return null;
    return splitTabIds.every((id) => tabs.some((tab) => tab.id === id)) ? [splitTabIds[0], splitTabIds[1]] : null;
  })();

  useNativeTabBridge({
    enabled: NATIVE_TABS,
    tabs,
    activeTabId,
    profileForTab: (tab) => {
      const space = spaces.find((item) => item.id === tab.spaceId);
      return resolveSpaceProfile(space?.profileId, profiles).id;
    },
    pageRef: pageAreaRef,
    splitTabIds: nativeSplitIds,
    splitRatio,
    pageVisible: nativePageVisible,
    onLoadingChange: (tabId, loading) => {
      setTabLoadingStates((prev) => (prev[tabId] === loading ? prev : { ...prev, [tabId]: loading }));
    },
    onSnapshot: (tabId, dataUrl) => {
      setPageSnapshots((previous) => ({ ...previous, [tabId]: dataUrl }));
    },
  });

  useEffect(() => {
    if (!NATIVE_TABS) return;
    const api = window.orbApi;
    if (!api) return;
    const subscription = api.on('orb:find-result', (payload) => {
      const result = payload as { tabId?: unknown; activeMatchOrdinal?: unknown; matches?: unknown };
      if (result.tabId !== useTabStore.getState().activeTabId) return;
      if (typeof result.activeMatchOrdinal !== 'number' || typeof result.matches !== 'number') return;
      setFindResult({ active: result.activeMatchOrdinal, matches: result.matches });
    });
    return () => {
      if (subscription) api.off(subscription);
    };
  }, []);
  const tabPresentation = getTabRailPresentation(tabLayout, compactSideTabs, false, false);
  const showTopTabs = !compactMode && showTabStrip && tabPresentation.horizontalTabsVisible;
  const showSideTabs = !compactMode && showTabStrip && !tabPresentation.horizontalTabsVisible;


  const renderTabPage = (tab: Tab, isActive = false) => {
    const pageSpace = spaces.find((space) => space.id === tab.spaceId);
    const pageProfile = resolveSpaceProfile(pageSpace?.profileId, profiles);
    const pageTabCount = tabs.filter((item) => item.spaceId === tab.spaceId).length;
    if (tab.url === 'about:blank') {
      return showStartPage
        ? <StartPage spaceName={pageSpace?.name || 'Personal'} spaceId={tab.spaceId} profileId={pageProfile.id} tabCount={pageTabCount} onNavigate={handleNavigate} />
        : <div className="orb-frame absolute inset-0" aria-label="Blank new tab" />;
    }
    if (tab.isUnloaded) {
      const host = (() => { try { return new URL(tab.url).hostname; } catch { return tab.url; } })();
      const title = tidyTitle(tab.url, tab.title) || host;
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <p className="orb-strong text-sm font-medium">Tab unloaded</p>
          <p className="orb-muted max-w-sm truncate text-xs">{title}</p>
          <button type="button" onClick={() => useTabStore.getState().loadTab(tab.id)} className="orb-control mt-1 rounded-md border orb-border px-3 py-1.5 text-xs">Load tab</button>
        </div>
      );
    }
    // The native view is the page; the shell only reserves the space.
    if (NATIVE_TABS) return <div className="absolute inset-0" aria-hidden="true" />;
    return (
      <div
        className="absolute inset-0 flex-1 overflow-hidden"
        style={!isActive ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
      >
        <WebView
          key={tab.id}
          ref={(instance) => { if (instance) webviewRefs.current[tab.id] = instance; else delete webviewRefs.current[tab.id]; }}
          tabId={tab.id}
          url={tab.url}
          spaceId={tab.spaceId}
          profileId={pageProfile.id}
          onUrlChange={(url) => {
            updateTab(tab.id, { url });
            setGlanceCandidate((current) => current?.tabId === tab.id ? null : current);
            setGlanceUrl(null);
          }}
          onTitleChange={(title) => updateTab(tab.id, { title })}
          onFaviconChange={(favicon) => updateTab(tab.id, { favicon })}
          onLoadingChange={(loading) => setTabLoadingStates((prev) => ({ ...prev, [tab.id]: loading }))}
          onFoundInPage={(result) => setFindResult({ active: result.activeMatchOrdinal, matches: result.matches })}
          onGlanceLink={(url) => {
            const safeUrl = normalizeGlanceUrl(url);
            if (safeUrl) setGlanceCandidate({ url: safeUrl, tabId: tab.id });
          }}
        />
      </div>
    );
  };

  const splitTabs = splitTabIds?.map((id) => tabs.find((tab) => tab.id === id) || null) || null;
  const focusPane = (pane: 0 | 1) => {
    const tabId = splitTabIds?.[pane];
    focusSplitPane(pane);
    if (tabId) setActiveTab(tabId);
  };

  useEffect(() => {
    if (!pickerNotice) return;
    const timeout = window.setTimeout(() => setPickerNotice(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [pickerNotice]);

  return (
    <div className="orb-frame flex h-screen w-screen overflow-hidden">
      {welcomeOpen && <Onboarding onFinish={finishOnboarding} onSkip={skipOnboarding} macTrafficLights={hasMacTrafficLights} />}
      <StartupSessionPrompt enabled={!welcomeOpen} />
      {/* Main content area */}
      <main
        aria-hidden={welcomeOpen || undefined}
        {...(welcomeOpen ? { inert: '' } : {})}
        className="relative flex min-w-0 flex-1 overflow-hidden"
      >
        {showSideTabs && !isFullscreen ? (
          <VerticalTabPanel
            isOpen
            embedded
            compact={compactSideTabs}
            peeked={railPeek}
            onExpand={() => setRailPeek(true)}
            onClose={() => setTabLayout('top')}
            onCollapse={() => { setCompactSideTabs(true); setRailPeek(false); }}
            onReload={navigateReload}
            spaceId={activeSpaceId || ''}
            mutedSites={mutedSites}
            onToggleMute={toggleTabMute}
            onToggleSiteMute={toggleSiteMute}
            fullscreen={isFullscreen}
            onOpenSplitPicker={setSplitPickerTabId}
          />
        ) : null}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {showTopTabs && !isFullscreen ? <TabBar
          tabs={spaceTabs}
          activeTabId={activeTabId}
          activeSpaceId={activeSpaceId || ''}
          setActiveTab={setActiveTab}
          onReload={navigateReload}
          mutedSites={mutedSites}
          onToggleMute={toggleTabMute}
          onToggleSiteMute={toggleSiteMute}
          fullscreen={isFullscreen}
          onOpenSplitPicker={setSplitPickerTabId}
        /> : null}
        {/* Traffic lights sit over the sidebar, so only inset the content
            column when there is no sidebar at all. */}
        {!showTopTabs && !showSideTabs && hasMacTrafficLights && !isFullscreen && <div aria-hidden="true" className="h-12 shrink-0" />}
        {showNavigation && !compactMode && <BrowserToolbar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onBack={navigateBack}
          onForward={navigateForward}
          onReload={navigateReload}
          loadingProgress={activeTabLoading ? 1 : 0}
          onDownloadsToggle={() => setDownloadsOpen((o) => !o)}
          onOpenSettings={() => { setSettingsSection('appearance'); setSettingsOpen(true); }}
          trafficLightInset={hasMacTrafficLights && !isFullscreen}
          onPickElement={() => void handlePickElement()}
          canPickElement={Boolean(activeTab && activeTab.url !== 'about:blank') && !pickerBusy}
          glanceUrl={glanceCandidate?.url || null}
          onGlance={() => { if (glanceCandidate) setGlanceUrl(glanceCandidate.url); }}
          splitActive={Boolean(nativeSplitIds)}
          onSwapSplit={swapSplit}
          onCloseSplit={closeSplit}
        />}
        {bookmarksBarVisible && !compactMode && !isFullscreen && <BookmarksBar onNavigate={handleNavigate} />}

        {!compactMode && (!showTabStrip || !showNavigation) && <div className="pointer-events-none absolute left-2 top-[58px] z-30 flex gap-1">
          {!showTabStrip && <button type="button" onClick={() => setShowTabStrip(true)} aria-label="Show tabs" title="Show tabs" className="orb-elevated orb-control pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md border orb-border shadow-sm"><List className="h-3.5 w-3.5" /></button>}
          {!showNavigation && <button type="button" onClick={() => setShowNavigation(true)} aria-label="Show navigation toolbar" title="Show navigation toolbar" className="orb-elevated orb-control pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md border orb-border shadow-sm"><NavigationArrow className="h-3.5 w-3.5" /></button>}
        </div>}
        {compactMode && <button type="button" onClick={() => setCompactMode(false)} aria-label="Restore browser controls" title="Restore browser controls · ⌘/Ctrl+Shift+M" className="orb-elevated orb-control fixed left-1/2 top-1 z-40 -translate-x-1/2 rounded-full border orb-border px-3 py-1 text-[10px] opacity-25 shadow-sm transition-opacity hover:opacity-100 focus:opacity-100">Show controls</button>}
        {glanceUrl && glanceCandidate && (() => {
          const candidateTab = tabs.find((tab) => tab.id === glanceCandidate.tabId);
          if (!candidateTab) return null;
          const candidateSpace = spaces.find((space) => space.id === candidateTab.spaceId);
          const candidateProfile = resolveSpaceProfile(candidateSpace?.profileId, profiles);
          return <GlanceView url={glanceUrl} profileId={candidateProfile.id} onClose={() => setGlanceUrl(null)} onOpen={(url) => {
            setActiveTab(candidateTab.id);
            updateTab(candidateTab.id, { url });
            setGlanceUrl(null);
            setGlanceCandidate(null);
          }} />;
        })()}

        {findOpen && <FindBar
          query={findQuery}
          result={findResult}
          onQueryChange={setFindQuery}
          onNext={() => runFind(findQuery, true, true)}
          onPrevious={() => runFind(findQuery, false, true)}
          onClose={closeFind}
        />}

        {/* Web Content */}
        <div ref={pageAreaRef} data-orb-page-area className="orb-frame relative flex-1 overflow-hidden">
          {historyOpen && <HistoryPage onNavigate={handleNavigate} onOpenNewTab={openInNewTab} onClose={() => setHistoryOpen(false)} />}
          {NATIVE_TABS && activeSnapshot && (!nativePageVisible || activeTabLoading) ? (
            <img src={activeSnapshot} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-top" />
          ) : null}
          {splitTabs?.[0] && splitTabs[1] ? <>
            <div ref={splitAreaRef} className="absolute inset-0 grid" style={{ gridTemplateColumns: `minmax(0, ${splitRatio}fr) 8px minmax(0, ${1 - splitRatio}fr)` }}>
              {[0, 1].map((pane) => {
                const tab = splitTabs[pane];
                if (!tab) return null;
                return <React.Fragment key={pane}>
                  {pane === 1 && <div role="separator" aria-label="Resize split view" aria-orientation="vertical" tabIndex={0}
                    onPointerDown={(event) => { event.preventDefault(); setResizingSplit(true); }}
                    onKeyDown={(event) => {
                      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                      event.preventDefault(); setSplitRatio(splitRatio + (event.key === 'ArrowLeft' ? -0.025 : 0.025));
                    }}
                    className={`orb-border relative z-10 cursor-col-resize border-x ${resizingSplit ? 'bg-[var(--orb-accent-soft)]' : 'bg-[var(--orb-border)] hover:bg-[var(--orb-accent)]'}`} />}
                  <div onPointerDownCapture={() => focusPane(pane as 0 | 1)} className={`relative min-w-0 overflow-hidden ${activePane === pane ? 'ring-1 ring-inset ring-[var(--orb-accent)]' : ''}`}>
                    {renderTabPage(tab)}
                  </div>
                </React.Fragment>;
              })}
            </div>
            {!NATIVE_TABS && <div className="orb-elevated orb-shadow absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border orb-border p-1">
              <button type="button" aria-label="Swap split panes" title="Swap panes" onClick={swapSplit} className="orb-control flex h-7 w-7 items-center justify-center rounded"><ArrowsLeftRight className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Close split view" title="Close split view" onClick={closeSplit} className="orb-control flex h-7 w-7 items-center justify-center rounded"><X className="h-3.5 w-3.5" /></button>
            </div>}
          </> : NATIVE_TABS ? (
            activeTab ? renderTabPage(activeTab, true) : null
          ) : (
            <>
              {mountedTabs.length > 0
                ? mountedTabs.map((tab) => renderTabPage(tab, tab.id === activeTabId))
                : (
                  <div className="orb-muted absolute inset-0 flex flex-col items-center justify-center">
                    <div className="orb-strong mb-2 text-2xl font-medium tracking-tight">Orb</div>
                    <div className="text-sm">Open a tab or press ⌘K to find a space</div>
                  </div>
                )}
            </>
          )}
        </div>
        </div>

        {/* Command Bar Overlay */}
        {commandBarOpen && <CommandBar onClose={() => setCommandBarOpen(false)} onOpenSettings={() => { setSettingsSection('appearance'); setSettingsOpen(true); setCommandBarOpen(false); }} onOpenHistory={() => { setHistoryOpen(true); setCommandBarOpen(false); }} />}
        {splitPickerTabId && (() => {
          const anchorTab = spaceTabs.find((tab) => tab.id === splitPickerTabId);
          return (
            <SplitViewPicker
              tabs={spaceTabs.filter((tab) => tab.id !== splitPickerTabId)}
              activeTitle={anchorTab?.title || anchorTab?.url || ''}
              onPick={(tabId) => {
                openSplit([splitPickerTabId, tabId]);
                setSplitPickerTabId(null);
              }}
              onClose={() => setSplitPickerTabId(null)}
            />
          );
        })()}
        {settingsOpen && <Settings initialSection={settingsSection} activeUrl={activeTab?.url} onNavigate={handleNavigate} onExportPdf={() => void exportActivePdf()} onPreviewBoost={previewBoost} onReplayOnboarding={replayOnboarding} onClose={() => setSettingsOpen(false)} />}
        {pickerNotice && <div role="status" aria-live="polite" className="orb-elevated orb-shadow absolute bottom-5 left-1/2 z-40 max-w-[min(520px,90vw)] -translate-x-1/2 rounded-lg border orb-border px-4 py-3 text-xs orb-strong">{pickerNotice}</div>}
        <PermissionPrompt />
        {downloadsOpen && (
          <DownloadsPanel
            downloads={downloads}
            onCancel={(id) => { window.orbApi?.cancelDownload(id); setDownloadsOpen(false); }}
            onRemove={(id) => { window.orbApi?.removeDownload(id); }}
            onClearCompleted={() => { window.orbApi?.clearCompletedDownloads(); }}
            setDownloadPath={async (p) => {
              const result = await window.orbApi?.setDownloadPath(p);
              if (result?.ok && typeof result.path === 'string') setCurrentDownloadPath(result.path);
            }}
            currentDownloadPath={currentDownloadPath}
            onClose={() => setDownloadsOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
