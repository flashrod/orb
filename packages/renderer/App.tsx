import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSpaceStore } from './stores/spaces';
import { useTabStore } from './stores/tabs';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import CommandBar from './components/CommandBar';
import AddressBar from './components/AddressBar';
import NavigationBar from './components/NavigationBar';
import WebView from './components/WebView';
import VerticalTabPanel from './components/VerticalTabPanel';


export default function App() {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [verticalTabsOpen, setVerticalTabsOpen] = useState(false);
  const { spaces, activeSpaceId, setActiveSpace, addSpace } = useSpaceStore();
  const { activeTabId, tabs, setActiveTab, updateTab } = useTabStore();

  const webviewRef = useRef<any>(null);

  const navigateBack = useCallback(() => webviewRef.current?.navigateBack(), []);
  const navigateForward = useCallback(() => webviewRef.current?.navigateForward(), []);
  const navigateReload = useCallback(() => webviewRef.current?.navigateReload(), []);

  useEffect(() => {
    if (useSpaceStore.getState().spaces.length === 0) {
      addSpace({ name: 'Personal', icon: 'globe', color: '#a0522d', tabIds: [] });
    }
  }, [addSpace]);

  const handleNavigate = useCallback((url: string) => {
    if (activeTabId) {
      updateTab(activeTabId, { url });
    }
  }, [activeTabId, updateTab]);

  useEffect(() => {
    // Initialize default space if none exist
    if (spaces.length === 0) {
      // Handled by store init; just ensure something exists
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        setCommandBarOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
      }
      if (e.key === 'Escape') {
        setCommandBarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle navigate events from CommandBar / AddressBar
    const handleNavigateEvent = (e: CustomEvent) => {
      const { url } = e.detail as { url: string };
      if (activeTabId) {
        updateTab(activeTabId, { url });
      }
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
  }, [spaces.length, commandBarOpen, activeTabId, updateTab]);

  const activeSpace = spaces.find((s: { id: string }) => s.id === activeSpaceId);
  const spaceTabs = activeSpaceId
    ? tabs.filter((t: { spaceId: string }) => t.spaceId === activeSpaceId)
    : [];
  const activeTab = tabs.find((t: { id: string }) => t.id === activeTabId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-100 text-stone-700">
      {/* Sidebar */}
      <Sidebar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        setActiveSpace={setActiveSpace}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Navigation controls */}
        <div className="flex h-10 items-center border-b border-stone-200 bg-stone-100 px-2">
          <NavigationBar
            onBack={navigateBack}
            onForward={navigateForward}
            onReload={navigateReload}
            onToggleVerticalTabs={() => setVerticalTabsOpen(!verticalTabsOpen)}
          />
        </div>

        {/* Address Bar */}
        <AddressBar
          activeTab={activeTab}
          onNavigate={handleNavigate}
        />

        <TabBar
          tabs={spaceTabs}
          activeTabId={activeTabId}
          activeSpaceId={activeSpaceId || ''}
          setActiveTab={setActiveTab}
        />

        {/* Web Content */}
        <div className="relative flex-1 overflow-hidden bg-stone-100">
          {activeTabId ? (
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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400">
              <div className="mb-2 text-2xl font-medium tracking-tight text-stone-700">Orb</div>
              <div className="text-sm">Open a tab or press ⌘K to find a space</div>
            </div>
          )}
        </div>

        {/* Vertical Tabs Panel */}
        {verticalTabsOpen && (
          <VerticalTabPanel
            isOpen={verticalTabsOpen}
            onClose={() => setVerticalTabsOpen(false)}
            spaceId={activeSpaceId || ''}
          />
        )}

        {/* Command Bar Overlay */}
        {commandBarOpen && <CommandBar onClose={() => setCommandBarOpen(false)} />}
      </div>
    </div>
  );
}
