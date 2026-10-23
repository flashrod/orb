import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSpaceStore } from './stores/spaces';
import { useTabStore } from './stores/tabs';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import CommandBar from './components/CommandBar';
import AddressBar from './components/AddressBar';
import NavigationBar from './components/NavigationBar';
import WebView from './components/WebView';


export default function App() {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const { spaces, activeSpaceId, setActiveSpace } = useSpaceStore();
  const { activeTabId, tabs, setActiveTab, updateTab } = useTabStore();

  const webviewRef = useRef<any>(null);

  const navigateBack = useCallback(() => webviewRef.current?.navigateBack(), []);
  const navigateForward = useCallback(() => webviewRef.current?.navigateForward(), []);
  const navigateReload = useCallback(() => webviewRef.current?.navigateReload(), []);

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spaces.length, commandBarOpen]);

  const activeSpace = spaces.find((s: { id: string }) => s.id === activeSpaceId);
  const spaceTabs = activeSpaceId
    ? tabs.filter((t: { spaceId: string }) => t.spaceId === activeSpaceId)
    : [];
  const activeTab = tabs.find((t: { id: string }) => t.id === activeTabId);

  return (
    <div className="flex h-screen w-screen bg-orb-dark">
      {/* Sidebar */}
      <Sidebar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        setActiveSpace={setActiveSpace}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Navigation controls */}
        <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-2">
          <NavigationBar
            onBack={navigateBack}
            onForward={navigateForward}
            onReload={navigateReload}
          />
        </div>

        {/* Address Bar */}
        <AddressBar
          activeTab={activeTab}
          onNavigate={handleNavigate}
        />

        {/* Web Content */}
        <div className="flex-1 relative overflow-hidden bg-black">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
              <div className="text-2xl font-medium mb-2">Orb</div>
              <div className="text-sm">Open a new tab to start browsing</div>
            </div>
          )}
        </div>

        {/* Command Bar Overlay */}
        {commandBarOpen && <CommandBar onClose={() => setCommandBarOpen(false)} />}
      </div>
    </div>
  );
}
