import React, { useState } from 'react';
import { Globe, Plus, X } from '@phosphor-icons/react';
import { useTabStore } from '../stores/tabs';
import { getTabsToClose, isLastTabToClose, orderPinnedTabsFirst } from '../lib/tabActions';
import TabContextMenu from './TabContextMenu';

const hasMacTrafficLights = /Mac/i.test(navigator.platform || navigator.userAgent);

function getHostname(url: string): string {
  try { return new URL(url).hostname || 'New tab'; } catch { return 'New tab'; }
}

export default function TabBar({
  tabs,
  activeTabId,
  activeSpaceId,
  setActiveTab,
  onReload,
}: {
  tabs: { id: string; url: string; title: string; favicon: string; isPinned: boolean }[];
  activeTabId: string | null;
  activeSpaceId: string;
  setActiveTab: (id: string | null) => void;
  onReload: () => void;
}) {
  const { removeTab, addTab, moveTab, updateTab } = useTabStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [contextTabId, setContextTabId] = useState<string | null>(null);
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const displayTabs = orderPinnedTabsFirst(tabs);

  const handleNewTab = (afterTabId?: string) => {
    addTab({ spaceId: activeSpaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
    const newTabId = useTabStore.getState().activeTabId;
    if (afterTabId && newTabId) {
      const allTabs = useTabStore.getState().tabs;
      const afterIndex = allTabs.findIndex((tab) => tab.id === afterTabId);
      moveTab(newTabId, activeSpaceId, afterIndex + 1);
    }
  };

  const handleCloseMany = (tabIds: string[]) => tabIds.forEach((id) => removeTab(id));
  const closeTab = (id: string) => {
    const allTabs = useTabStore.getState().tabs;
    if (isLastTabToClose(allTabs, id) && window.orbApi?.closeCurrentWindow) {
      void window.orbApi.closeCurrentWindow();
      return;
    }
    removeTab(id);
  };

  return (
    <div role="tablist" aria-label="Open tabs" className={`orb-tab-strip orb-sidebar flex shrink-0 items-end gap-1 overflow-x-auto border-b orb-border pt-1 scrollbar-hide ${hasMacTrafficLights ? 'pl-[112px] pr-3' : 'px-3'}`}>
      {displayTabs.map((tab) => {
        const hostname = getHostname(tab.url);
        const isActive = activeTabId === tab.id;
        return (
          <div key={tab.id} draggable onDragStart={(event) => { setDraggingId(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); }} onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain') || draggingId; if (!id || id === tab.id) return; const allTabs = useTabStore.getState().tabs; const targetIndex = allTabs.findIndex((item) => item.id === tab.id); const sourceIndex = allTabs.findIndex((item) => item.id === id); moveTab(id, activeSpaceId, targetIndex - (sourceIndex < targetIndex ? 1 : 0)); }} onAuxClick={(event) => { if (event.button === 1) closeTab(tab.id); }} onContextMenu={(event) => { event.preventDefault(); setContextTabId(tab.id); setContextPosition({ x: event.clientX, y: event.clientY }); }} className={`group relative flex h-full shrink-0 items-end ${draggingId === tab.id ? 'opacity-40' : ''}`}>
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab.isPinned ? `Pinned tab: ${tab.title || hostname}` : tab.title || hostname}
              title={`${tab.title || hostname} · ${hostname}`}
              onClick={() => setActiveTab(tab.id)}
              className={`orb-tab relative flex h-[37px] items-center rounded-t-[9px] border border-b-0 text-left transition-colors ${tab.isPinned ? 'w-9 justify-center px-0' : 'min-w-[128px] max-w-[210px] gap-2 px-3 pr-8'} ${isActive ? 'orb-tab-active orb-border' : 'border-transparent'}`}
            >
              {tab.favicon ? (
                <img src={tab.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
              ) : (
                <span className="orb-accent-soft orb-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-md"><Globe aria-hidden="true" className="h-3 w-3" /></span>
              )}
              {!tab.isPinned && <span className="orb-strong min-w-0 flex-1 truncate text-[12px] font-medium">{tab.title || hostname}</span>}
            </button>
            <button type="button" aria-label={`Close ${tab.title || hostname}`} onClick={() => closeTab(tab.id)} className={`orb-control absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${tab.isPinned ? 'right-0' : 'right-1'}`}>
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => handleNewTab()} aria-label="New tab" title="New tab" className="orb-control mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><Plus className="h-4 w-4" /></button>
      {contextTabId && contextPosition && (() => {
        const tab = displayTabs.find((item) => item.id === contextTabId);
        if (!tab) return null;
        const closeOthers = getTabsToClose(displayTabs, tab.id, 'others');
        const closeRight = getTabsToClose(displayTabs, tab.id, 'right');
        return <TabContextMenu
          {...contextPosition}
          title={tab.title || getHostname(tab.url)}
          isPinned={tab.isPinned}
          canReload={activeTabId === tab.id}
          canCloseOthers={closeOthers.length > 0}
          canCloseToRight={closeRight.length > 0}
          onNewTab={() => handleNewTab(tab.id)}
          onReload={onReload}
          onDuplicate={() => addTab({ spaceId: activeSpaceId, url: tab.url, title: tab.title, favicon: tab.favicon, isPinned: tab.isPinned, isActive: true })}
          onTogglePinned={() => updateTab(tab.id, { isPinned: !tab.isPinned })}
          onCloseTab={() => closeTab(tab.id)}
          onCloseOthers={() => handleCloseMany(closeOthers)}
          onCloseToRight={() => handleCloseMany(closeRight)}
          onDismiss={() => { setContextTabId(null); setContextPosition(null); }}
        />;
      })()}
    </div>
  );
}
