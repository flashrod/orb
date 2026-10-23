import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSpaceStore } from './stores/spaces';
import { useProfileStore } from './stores/profiles';
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
import { useAppearanceStore } from './stores/appearance';
import StartPage from './components/StartPage';
import GlanceView from './components/GlanceView';
import { useBoostStore } from './stores/boosts';
import BookmarksBar from './components/BookmarksBar';
import PermissionPrompt from './components/PermissionPrompt';
import { getTabRailPresentation, matchesTabRailShortcut } from './lib/tabRail';
import { ArrowsLeftRight, X, List, NavigationArrow } from '@phosphor-icons/react';
import { normalizeGlanceUrl } from './lib/glance';

const hasMacTrafficLights = /Mac/i.test(navigator.platform || navigator.userAgent);

export default function App() {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'appearance' | 'privacy' | 'boosts' | 'toolbar' | 'profiles'>('appearance');
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerNotice, setPickerNotice] = useState('');
  const [glanceCandidate, setGlanceCandidate] = useState<{ url: string; tabId: string } | null>(null);
  const [glanceUrl, setGlanceUrl] = useState<string | null>(null);
  const [tabRailKeyboardRevealed, setTabRailKeyboardRevealed] = useState(false);
  const [resizingSplit, setResizingSplit] = useState(false);
  // Tracks which tabs have a WebView mounted. Once mounted, a tab stays mounted
  // even when inactive so switching tabs never reloads the page.
  const [mountedTabIds, setMountedTabIds] = useState<Set<string>>(new Set());
  // Per-tab loading state, used for the thin progress bar in the toolbar
  const [tabLoadingStates, setTabLoadingStates] = useState<Record<string, boolean>>({});
  const { spaces, activeSpaceId, addSpace, setActiveSpace } = useSpaceStore();
  const profiles = useProfileStore((state) => state.profiles);
  const { activeTabId, tabs, setActiveTab, updateTab } = useTabStore();
  const splitTabIds = useSplitViewStore((state) => state.tabIds);
  const splitRatio = useSplitViewStore((state) => state.ratio);
  const activePane = useSplitViewStore((state) => state.activePane);
  const focusSplitPane = useSplitViewStore((state) => state.focusPane);
  const replaceSplitTab = useSplitViewStore((state) => state.replaceActiveTab);
  const setSplitRatio = useSplitViewStore((state) => state.setRatio);
  const closeSplit = useSplitViewStore((state) => state.close);
  const swapSplit = useSplitViewStore((state) => state.swap);
  const { theme, accent, density, motion, tabLayout, bookmarksBarVisible, compactSideTabs, showStartPage, showTabStrip, showNavigation, compactMode, customColors, setTabLayout, setCompactMode, setShowTabStrip, setShowNavigation } = useAppearanceStore();

  const webviewRefs = useRef<Record<string, any>>({});
  const splitAreaRef = useRef<HTMLDivElement | null>(null);
  const getActiveWebView = useCallback(() => {
    const selectedId = useTabStore.getState().activeTabId;
    return selectedId ? webviewRefs.current[selectedId] : null;
  }, []);

  const navigateBack = useCallback(() => getActiveWebView()?.navigateBack(), [getActiveWebView]);
  const navigateForward = useCallback(() => getActiveWebView()?.navigateForward(), [getActiveWebView]);
  const navigateReload = useCallback(() => getActiveWebView()?.navigateReload(), [getActiveWebView]);

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

  // Lazily mount the active tab's WebView on first visit; keep it mounted
  // thereafter so switching tabs never reloads the page.
  useEffect(() => {
    if (!activeTabId) return;
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
    window.addEventListener('focus', restoreTabIfNeeded);
    return () => window.removeEventListener('focus', restoreTabIfNeeded);
  }, []);

  const handleNavigate = useCallback((url: string) => {
    let targetTabId = useTabStore.getState().activeTabId;
    if (!targetTabId) {
      const spaceId = useSpaceStore.getState().activeSpaceId || useSpaceStore.getState().spaces[0]?.id;
      if (!spaceId) return;
      useTabStore.getState().addTab({ spaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
      targetTabId = useTabStore.getState().activeTabId;
    }
    if (targetTabId) useTabStore.getState().updateTab(targetTabId, { url });
  }, []);

  useEffect(() => {
    // Initialize default space if none exist
    if (spaces.length === 0) {
      // Handled by store init; just ensure something exists
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
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
      if (matchesTabRailShortcut(e) && useAppearanceStore.getState().tabLayout === 'split' && useAppearanceStore.getState().compactSideTabs) {
        e.preventDefault();
        setTabRailKeyboardRevealed((revealed) => !revealed);
      }
      if (e.key === 'Escape') {
        setCommandBarOpen(false);
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

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('orb:navigate', handleNavigateEvent as EventListener);
      window.removeEventListener('orb:new-tab', handleNewTab);
      window.removeEventListener('orb:new-space', handleNewSpace);
      window.removeEventListener('orb:popup-requested', handlePopupRequestedEvent);
    };
  }, [spaces.length, commandBarOpen, handleNavigate]);

  const spaceTabs = activeSpaceId
    ? tabs.filter((t: { spaceId: string }) => t.spaceId === activeSpaceId)
    : [];
  const mountedTabs = spaceTabs.filter((tab) => mountedTabIds.has(tab.id));
  const activeTab = tabs.find((t: { id: string }) => t.id === activeTabId);
  const activeTabLoading = activeTab ? tabLoadingStates[activeTab.id] || false : false;
  const activeSpace = spaces.find((space) => space.id === activeSpaceId);
  const activeProfile = resolveSpaceProfile(activeSpace?.profileId, profiles);
  const tabPresentation = getTabRailPresentation(tabLayout, compactSideTabs, tabRailKeyboardRevealed, false);
  const showTopTabs = !compactMode && showTabStrip && tabPresentation.horizontalTabsVisible;
  const showSideTabs = !compactMode && showTabStrip && !tabPresentation.horizontalTabsVisible;

  const handlePickElement = async () => {
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
      const selection = await getActiveWebView()?.pickElement();
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
      await getActiveWebView()?.applyCSS(rule);
      setPickerNotice(`Saved and hid “${selection.label || selection.selector}” on ${hostname}.`);
    } catch (error) {
      setPickerNotice(error instanceof Error ? error.message : 'Could not save this Boost.');
    } finally {
      setPickerBusy(false);
    }
  };

  const renderTabPage = (tab: Tab, isActive = false) => {
    const pageSpace = spaces.find((space) => space.id === tab.spaceId);
    const pageProfile = resolveSpaceProfile(pageSpace?.profileId, profiles);
    const pageTabCount = tabs.filter((item) => item.spaceId === tab.spaceId).length;
    if (tab.url === 'about:blank') {
      return showStartPage
        ? <StartPage spaceName={pageSpace?.name || 'Personal'} spaceId={tab.spaceId} profileId={pageProfile.id} tabCount={pageTabCount} onNavigate={handleNavigate} />
        : <div className="orb-frame absolute inset-0" aria-label="Blank new tab" />;
    }
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
      {/* Main content area */}
      <main className="relative flex min-w-0 flex-1 overflow-hidden">
        {showSideTabs ? (
          <VerticalTabPanel
            isOpen
            embedded
            compact={compactSideTabs}
            keyboardRevealed={tabRailKeyboardRevealed}
            onToggleKeyboardReveal={() => setTabRailKeyboardRevealed((revealed) => !revealed)}
            onClose={() => setTabLayout('top')}
            onReload={navigateReload}
            spaceId={activeSpaceId || ''}
          />
        ) : null}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {showTopTabs ? <TabBar
          tabs={spaceTabs}
          activeTabId={activeTabId}
          activeSpaceId={activeSpaceId || ''}
          setActiveTab={setActiveTab}
          onReload={navigateReload}
        /> : null}
        {!showTopTabs && hasMacTrafficLights && <div aria-hidden="true" className="h-12 shrink-0" />}
        {showNavigation && !compactMode && <BrowserToolbar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onBack={navigateBack}
          onForward={navigateForward}
          onReload={navigateReload}
          loadingProgress={activeTabLoading ? 1 : 0}
          onPickElement={() => void handlePickElement()}
          canPickElement={Boolean(activeTab && activeTab.url !== 'about:blank') && !pickerBusy}
          glanceUrl={glanceCandidate?.url || null}
          onGlance={() => { if (glanceCandidate) setGlanceUrl(glanceCandidate.url); }}
        />}
        {bookmarksBarVisible && !compactMode && <BookmarksBar onNavigate={handleNavigate} />}

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

        {/* Web Content */}
        <div className="orb-frame relative flex-1 overflow-hidden">
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
            <div className="orb-elevated orb-shadow absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border orb-border p-1">
              <button type="button" aria-label="Swap split panes" title="Swap panes" onClick={swapSplit} className="orb-control flex h-7 w-7 items-center justify-center rounded"><ArrowsLeftRight className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Close split view" title="Close split view" onClick={closeSplit} className="orb-control flex h-7 w-7 items-center justify-center rounded"><X className="h-3.5 w-3.5" /></button>
            </div>
          </> : (
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
        {commandBarOpen && <CommandBar onClose={() => setCommandBarOpen(false)} onOpenSettings={() => { setSettingsSection('appearance'); setSettingsOpen(true); setCommandBarOpen(false); }} />}
        {settingsOpen && <Settings initialSection={settingsSection} activeUrl={activeTab?.url} onNavigate={handleNavigate} onClose={() => setSettingsOpen(false)} />}
        {pickerNotice && <div role="status" aria-live="polite" className="orb-elevated orb-shadow absolute bottom-5 left-1/2 z-40 max-w-[min(520px,90vw)] -translate-x-1/2 rounded-lg border orb-border px-4 py-3 text-xs orb-strong">{pickerNotice}</div>}
        <PermissionPrompt />
      </main>
    </div>
  );
}
