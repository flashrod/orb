import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSpaceStore } from './stores/spaces';
import { useTabStore } from './stores/tabs';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import CommandBar from './components/CommandBar';
import BrowserToolbar from './components/BrowserToolbar';
import WebView from './components/WebView';
import VerticalTabPanel from './components/VerticalTabPanel';
import Settings from './components/Settings';
import { useAppearanceStore } from './stores/appearance';
import StartPage from './components/StartPage';
import { useBoostStore } from './stores/boosts';
import BookmarksBar from './components/BookmarksBar';
import { getTabRailPresentation, matchesTabRailShortcut } from './lib/tabRail';


export default function App() {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'appearance' | 'privacy' | 'boosts' | 'toolbar'>('appearance');
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerNotice, setPickerNotice] = useState('');
  const [tabRailKeyboardRevealed, setTabRailKeyboardRevealed] = useState(false);
  const { spaces, activeSpaceId, setActiveSpace, addSpace } = useSpaceStore();
  const { activeTabId, tabs, setActiveTab, updateTab } = useTabStore();
  const { theme, accent, density, motion, tabLayout, sidebarWidth, sidebarAutoHide, bookmarksBarVisible, compactSideTabs, customColors, setTabLayout } = useAppearanceStore();

  const webviewRef = useRef<any>(null);

  const navigateBack = useCallback(() => webviewRef.current?.navigateBack(), []);
  const navigateForward = useCallback(() => webviewRef.current?.navigateForward(), []);
  const navigateReload = useCallback(() => webviewRef.current?.navigateReload(), []);

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
  }, [addSpace]);

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
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search or enter address"]')?.focus();
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
    const handleNewSpace = () => {
      useSpaceStore.getState().addSpace({
        name: 'New Space',
        icon: 'globe',
        color: '#a0522d',
        tabIds: [],
      });
    };
    window.addEventListener('orb:navigate', handleNavigateEvent as EventListener);
    window.addEventListener('orb:new-tab', handleNewTab);
    window.addEventListener('orb:new-space', handleNewSpace);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('orb:navigate', handleNavigateEvent as EventListener);
      window.removeEventListener('orb:new-tab', handleNewTab);
      window.removeEventListener('orb:new-space', handleNewSpace);
    };
  }, [spaces.length, commandBarOpen, handleNavigate]);

  const spaceTabs = activeSpaceId
    ? tabs.filter((t: { spaceId: string }) => t.spaceId === activeSpaceId)
    : [];
  const activeTab = tabs.find((t: { id: string }) => t.id === activeTabId);
  const activeSpace = spaces.find((space) => space.id === activeSpaceId);
  const tabPresentation = getTabRailPresentation(tabLayout, compactSideTabs, tabRailKeyboardRevealed, false);

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
      const selection = await webviewRef.current?.pickElement();
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
      await webviewRef.current?.applyCSS(rule);
      setPickerNotice(`Saved and hid “${selection.label || selection.selector}” on ${hostname}.`);
    } catch (error) {
      setPickerNotice(error instanceof Error ? error.message : 'Could not save this Boost.');
    } finally {
      setPickerBusy(false);
    }
  };

  useEffect(() => {
    if (!pickerNotice) return;
    const timeout = window.setTimeout(() => setPickerNotice(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [pickerNotice]);

  return (
    <div className="orb-frame flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        setActiveSpace={setActiveSpace}
        width={sidebarWidth}
        autoHide={sidebarAutoHide}
        onOpenSettings={(section) => { setSettingsSection(section); setSettingsOpen(true); }}
      />

      {/* Main content area */}
      <main className="relative flex min-w-0 flex-1 overflow-hidden">
        {!tabPresentation.horizontalTabsVisible ? (
          <VerticalTabPanel
            isOpen
            embedded
            compact={compactSideTabs}
            keyboardRevealed={tabRailKeyboardRevealed}
            onToggleKeyboardReveal={() => setTabRailKeyboardRevealed((revealed) => !revealed)}
            onClose={() => setTabLayout('top')}
            spaceId={activeSpaceId || ''}
          />
        ) : null}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {tabPresentation.horizontalTabsVisible ? <TabBar
          tabs={spaceTabs}
          activeTabId={activeTabId}
          activeSpaceId={activeSpaceId || ''}
          setActiveTab={setActiveTab}
        /> : null}
        <BrowserToolbar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onBack={navigateBack}
          onForward={navigateForward}
          onReload={navigateReload}
          onPickElement={() => void handlePickElement()}
          canPickElement={Boolean(activeTab && activeTab.url !== 'about:blank') && !pickerBusy}
        />
        {bookmarksBarVisible && <BookmarksBar onNavigate={handleNavigate} />}

        {/* Web Content */}
        <div className="orb-frame relative flex-1 overflow-hidden">
          {!activeTab || activeTab.url === 'about:blank' ? (
            <StartPage
              spaceName={activeSpace?.name || 'Personal'}
              spaceId={activeSpaceId || activeSpace?.id || ''}
              tabCount={spaceTabs.length}
              onNavigate={handleNavigate}
            />
          ) : activeTabId ? (
            <WebView
              ref={webviewRef}
              tabId={activeTabId}
              url={activeTab?.url || ''}
              spaceId={activeSpaceId || ''}
              onUrlChange={(url) => updateTab(activeTabId, { url })}
              onTitleChange={(title) => updateTab(activeTabId, { title })}
              onFaviconChange={(favicon) => updateTab(activeTabId, { favicon })}
              onLoadingChange={() => {}}
            />
          ) : (
            <div className="orb-muted absolute inset-0 flex flex-col items-center justify-center">
              <div className="orb-strong mb-2 text-2xl font-medium tracking-tight">Orb</div>
              <div className="text-sm">Open a tab or press ⌘K to find a space</div>
            </div>
          )}
        </div>
        </div>

        {/* Command Bar Overlay */}
        {commandBarOpen && <CommandBar onClose={() => setCommandBarOpen(false)} />}
        {settingsOpen && <Settings initialSection={settingsSection} onClose={() => setSettingsOpen(false)} />}
        {pickerNotice && <div role="status" aria-live="polite" className="orb-elevated orb-shadow absolute bottom-5 left-1/2 z-40 max-w-[min(520px,90vw)] -translate-x-1/2 rounded-lg border orb-border px-4 py-3 text-xs orb-strong">{pickerNotice}</div>}
      </main>
    </div>
  );
}
