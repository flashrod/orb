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
  const { removeTab, addTab, moveTab } = useTabStore();
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const handleNewTab = () => {
    addTab({ spaceId: activeSpaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
  };

  return (
    <div role="tablist" aria-label="Open tabs" className="orb-tab-strip orb-sidebar flex shrink-0 items-end gap-1 overflow-x-auto border-b orb-border px-3 pt-1 scrollbar-hide">
      {tabs.map((tab) => {
        const hostname = getHostname(tab.url);
        const isActive = activeTabId === tab.id;
        return (
          <div key={tab.id} draggable onDragStart={(event) => { setDraggingId(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); }} onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain') || draggingId; if (!id || id === tab.id) return; const allTabs = useTabStore.getState().tabs; const targetIndex = allTabs.findIndex((item) => item.id === tab.id); const sourceIndex = allTabs.findIndex((item) => item.id === id); moveTab(id, activeSpaceId, targetIndex - (sourceIndex < targetIndex ? 1 : 0)); }} onAuxClick={(event) => { if (event.button === 1) removeTab(tab.id); }} className={`group relative flex h-full shrink-0 items-end ${draggingId === tab.id ? 'opacity-40' : ''}`}>
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              title={`${tab.title || hostname} · ${hostname}`}
              onClick={() => setActiveTab(tab.id)}
              className={`orb-tab relative flex h-[37px] min-w-[128px] max-w-[210px] items-center gap-2 rounded-t-[9px] border border-b-0 px-3 pr-8 text-left transition-colors ${isActive ? 'orb-tab-active orb-border' : 'border-transparent'}`}
            >
              {tab.favicon ? (
                <img src={tab.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
              ) : (
                <span className="orb-accent-soft orb-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
                  <Globe aria-hidden="true" className="h-3 w-3" />
                </span>
              )}
              <span className="orb-strong min-w-0 flex-1 truncate text-[12px] font-medium">{tab.title || hostname}</span>
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
