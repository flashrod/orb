import React, { useState } from 'react';
import { useTabStore } from '../stores/tabs';
import { Globe, List, Plus, X } from '@phosphor-icons/react';
import { getTabRailPresentation } from '../lib/tabRail';
import { getTabsToClose, isLastTabToClose, orderPinnedTabsFirst } from '../lib/tabActions';
import TabContextMenu from './TabContextMenu';

const hasMacTrafficLights = /Mac/i.test(navigator.platform || navigator.userAgent);

function getHostname(url: string): string {
  try { return new URL(url).hostname || 'New tab'; } catch { return 'New tab'; }
}

export default function VerticalTabPanel({
  isOpen,
  embedded = false,
  compact = false,
  keyboardRevealed = false,
  onToggleKeyboardReveal,
  onClose,
  onReload,
  spaceId,
}: {
  isOpen: boolean;
  embedded?: boolean;
  compact?: boolean;
  keyboardRevealed?: boolean;
  onToggleKeyboardReveal?: () => void;
  onClose: () => void;
  onReload: () => void;
  spaceId: string;
}) {
  const { tabs, activeTabId, setActiveTab, removeTab, moveTab, addTab, updateTab } = useTabStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [contextTabId, setContextTabId] = useState<string | null>(null);
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const presentation = getTabRailPresentation('split', compact, keyboardRevealed, hovered);
  const spaceTabs = orderPinnedTabsFirst(tabs.filter((tab) => tab.spaceId === spaceId));
  const pinnedTabs = spaceTabs.filter((tab) => tab.isPinned);
  const regularTabs = spaceTabs.filter((tab) => !tab.isPinned);

  const handleNewTab = (afterTabId?: string) => {
    addTab({ spaceId, url: 'about:blank', title: 'New Tab', favicon: '', isPinned: false, isActive: true });
    const newTabId = useTabStore.getState().activeTabId;
    if (afterTabId && newTabId) {
      const allTabs = useTabStore.getState().tabs;
      const afterIndex = allTabs.findIndex((tab) => tab.id === afterTabId);
      moveTab(newTabId, spaceId, afterIndex + 1);
    }
  };

  const handleCloseMany = (tabIds: string[]) => tabIds.forEach((id) => removeTab(id));
  const closeTab = (id: string) => {
    const allTabs = useTabStore.getState().tabs;
    removeTab(id);
    if (isLastTabToClose(allTabs, id)) void window.orbApi?.minimizeCurrentWindow();
  };

  const renderTab = (tab: (typeof spaceTabs)[number], isPinned: boolean) => {
    const hostname = getHostname(tab.url);
    return <div
      key={tab.id}
      draggable
      onDragStart={(event) => { setDraggingId(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); }}
      onDragEnd={() => setDraggingId(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain') || draggingId; if (!id || id === tab.id) return; const allTabs = useTabStore.getState().tabs; const targetIndex = allTabs.findIndex((item) => item.id === tab.id); const sourceIndex = allTabs.findIndex((item) => item.id === id); moveTab(id, spaceId, targetIndex - (sourceIndex < targetIndex ? 1 : 0)); }}
      onAuxClick={(event) => { if (event.button === 1) closeTab(tab.id); }}
      onContextMenu={(event) => { event.preventDefault(); setContextTabId(tab.id); setContextPosition({ x: event.clientX, y: event.clientY }); }}
      className={`orb-vertical-row group relative flex cursor-pointer items-center rounded-lg transition-colors ${isPinned ? 'h-9 w-9 justify-center p-1' : 'min-h-10 gap-3 px-3 py-2'} ${draggingId === tab.id ? 'opacity-40' : ''} ${activeTabId === tab.id ? 'orb-accent-soft orb-strong' : 'orb-control'}`}
      title={`${tab.title || hostname} · ${hostname}`}
    >
      {tab.favicon ? <img src={tab.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} /> : <span className="orb-accent-soft orb-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-md"><Globe className="h-3 w-3" /></span>}
      {!isPinned && <>
        <button type="button" role="tab" aria-selected={activeTabId === tab.id} onClick={() => setActiveTab(tab.id)} aria-label={tab.title || hostname} className="flex min-w-0 flex-1 flex-col text-left">
          <span className="orb-strong truncate text-sm">{tab.title || hostname}</span>
          <span className="orb-muted truncate text-xs">{hostname}</span>
        </button>
        <button type="button" aria-label={`Close ${tab.title || hostname}`} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }} className="orb-control flex h-6 w-6 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><X className="h-3 w-3" /></button>
      </>}
      {isPinned && <button type="button" role="tab" aria-selected={activeTabId === tab.id} aria-label={`Pinned tab: ${tab.title || hostname}`} onClick={() => setActiveTab(tab.id)} className="absolute inset-0 rounded-lg" />}
      {isPinned && <button type="button" aria-label={`Close ${tab.title || hostname}`} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }} className="orb-control absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><X className="h-2.5 w-2.5" /></button>}
    </div>;
  };

  if (!isOpen) return null;

  if (embedded && compact && presentation.collapsedHandle) {
    return <div style={hasMacTrafficLights ? { top: 48 } : undefined} onMouseEnter={() => setHovered(true)} className="absolute inset-y-0 left-0 z-30 flex w-[18px] items-start justify-center pt-2">
      <button type="button" onClick={onToggleKeyboardReveal} aria-label="Reveal compact vertical tabs" title="Reveal vertical tabs · ⌘/Ctrl+Shift+E" className="orb-sidebar orb-control flex h-9 w-[18px] items-center justify-center rounded-r-md border border-l-0 orb-border"><List className="h-3.5 w-3.5" /></button>
    </div>;
  }

  const contextTab = contextTabId ? spaceTabs.find((tab) => tab.id === contextTabId) : undefined;
  const closeOthers = contextTab ? getTabsToClose(spaceTabs, contextTab.id, 'others') : [];
  const closeRight = contextTab ? getTabsToClose(spaceTabs, contextTab.id, 'right') : [];

  return <>
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={embedded && compact ? { ...(hasMacTrafficLights ? { top: 48, height: 'calc(100% - 48px)' } : {}), width: 232, transform: hovered ? 'scale(1.015)' : 'scale(1)', transformOrigin: 'left center', transition: 'transform 170ms ease-out, box-shadow 170ms ease-out' } : undefined} className={embedded ? compact ? 'orb-sidebar absolute inset-y-0 left-0 z-30 flex h-full w-[232px] flex-col border-r orb-border orb-shadow' : 'orb-sidebar flex h-full w-[232px] shrink-0 flex-col border-r orb-border' : 'fixed inset-0 z-50 flex justify-end'}>
      {!embedded && <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[2px]" onClick={onClose} />}
      <aside role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : true} aria-label="Vertical tabs" className={`${embedded ? 'orb-sidebar w-full' : 'orb-surface orb-shadow relative z-10 w-80 border-l orb-border'} flex h-full flex-col`}>
        {embedded && !compact && hasMacTrafficLights && <div aria-hidden="true" className="h-12 shrink-0" />}
        <div className="flex h-11 items-center justify-between border-b orb-border px-3">
          <h3 className="orb-strong text-sm font-medium">Tabs</h3>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="New tab" title="New tab" onClick={() => handleNewTab()} className="orb-control flex h-7 w-7 items-center justify-center rounded-md"><Plus className="h-4 w-4" /></button>
            <button type="button" onClick={onClose} aria-label="Switch to top tabs" title="Switch to top tabs" className="orb-control flex h-7 w-7 items-center justify-center rounded-md"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {spaceTabs.length === 0 ? <div className="orb-muted px-4 py-10 text-center text-xs">No tabs in this space</div> : <>
            {pinnedTabs.length > 0 && <div aria-label="Pinned tabs" className="mb-2 flex flex-wrap gap-1">{pinnedTabs.map((tab) => renderTab(tab, true))}</div>}
            <div className="space-y-1">{regularTabs.map((tab) => renderTab(tab, false))}</div>
          </>}
        </div>
      </aside>
    </div>
    {contextTab && contextPosition && <TabContextMenu
      {...contextPosition}
      title={contextTab.title || getHostname(contextTab.url)}
      isPinned={contextTab.isPinned}
      canReload={activeTabId === contextTab.id}
      canCloseOthers={closeOthers.length > 0}
      canCloseToRight={closeRight.length > 0}
      onNewTab={() => handleNewTab(contextTab.id)}
      onReload={onReload}
      onDuplicate={() => addTab({ spaceId: contextTab.spaceId, url: contextTab.url, title: contextTab.title, favicon: contextTab.favicon, isPinned: contextTab.isPinned, isActive: true })}
      onTogglePinned={() => updateTab(contextTab.id, { isPinned: !contextTab.isPinned })}
      onCloseTab={() => closeTab(contextTab.id)}
      onCloseOthers={() => handleCloseMany(closeOthers)}
      onCloseToRight={() => handleCloseMany(closeRight)}
      onDismiss={() => { setContextTabId(null); setContextPosition(null); }}
    />}
  </>;
}
