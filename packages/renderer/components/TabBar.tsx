import React from 'react';
import { useTabStore } from '../stores/tabs';
import { Globe, PushPin, Plus, X } from '@phosphor-icons/react';

function getHostname(url: string): string {
  try { return new URL(url).hostname || 'New tab'; } catch { return 'New tab'; }
}

export default function TabBar({
  tabs,
  activeTabId,
  activeSpaceId,
  setActiveTab,
}: {
  tabs: { id: string; url: string; title: string; favicon: string; isPinned: boolean }[];
  activeTabId: string | null;
  activeSpaceId: string;
  setActiveTab: (id: string | null) => void;
}) {
  const { removeTab, addTab } = useTabStore();

  const handleNewTab = () => {
    addTab({ spaceId: activeSpaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
  };

  return (
    <div role="tablist" aria-label="Open tabs" className="orb-tab-strip orb-sidebar flex shrink-0 items-end gap-1 overflow-x-auto border-b orb-border px-3 pt-1.5 scrollbar-hide">
      {tabs.map((tab) => {
        const hostname = getHostname(tab.url);
        const isActive = activeTabId === tab.id;
        return (
          <div key={tab.id} onAuxClick={(event) => { if (event.button === 1) removeTab(tab.id); }} className="group relative">
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`orb-tab flex min-w-[132px] max-w-[220px] items-center gap-2.5 rounded-t-lg border border-b-0 pl-3 pr-8 text-left transition-colors ${isActive ? 'orb-tab-active orb-border' : 'border-transparent'}`}
            >
              {tab.favicon ? (
                <img src={tab.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
              ) : (
                <span className="orb-accent-soft orb-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
                  <Globe aria-hidden="true" className="h-3 w-3" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="orb-strong block truncate text-xs font-medium">{tab.title || hostname}</span>
                <span className="orb-muted block truncate text-[10px]">{hostname}</span>
              </span>
              {tab.isPinned && <PushPin aria-label="Pinned" className="orb-muted h-3 w-3 shrink-0" />}
            </button>
            <button
              type="button"
              aria-label={`Close ${tab.title || hostname}`}
              onClick={() => removeTab(tab.id)}
              className="orb-control absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={handleNewTab}
        aria-label="New tab"
        title="New tab"
        className="orb-control mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
