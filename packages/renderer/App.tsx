import React, { useEffect, useState } from 'react';
import { useSpaceStore } from './stores/spaces';
import { useTabStore } from './stores/tabs';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import CommandBar from './components/CommandBar';
import AddressBar from './components/AddressBar';
import WebView from './components/WebView';

export default function App() {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const { spaces, activeSpaceId, setActiveSpace } = useSpaceStore();
  const { activeTabId, tabs, setActiveTab } = useTabStore();

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
        {/* Tab Bar */}
        <TabBar
          tabs={spaceTabs}
          activeTabId={activeTabId}
          activeSpaceId={activeSpaceId || ''}
          setActiveTab={setActiveTab}
        />

        {/* Address Bar */}
        <AddressBar activeTab={tabs.find((t: { id: string }) => t.id === activeTabId)} />

        {/* Web Content */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {activeTabId ? (
            <WebView
              tabId={activeTabId}
              url={tabs.find((t: { id: string }) => t.id === activeTabId)?.url || ''}
              spaceId={activeSpaceId || ''}
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
