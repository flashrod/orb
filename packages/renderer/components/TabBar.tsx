import React, { useState } from 'react';
import { CaretDown, Globe, Plus, X, FolderSimple } from '@phosphor-icons/react';
import { useTabStore, Tab, TabGroup } from '../stores/tabs';
import { getTabsToClose, isLastTabToClose, orderPinnedTabsFirst } from '../lib/tabActions';
import { partitionTabsByGroup } from '../lib/tabGroups';
import TabContextMenu from './TabContextMenu';
import { useShellOverlay } from '../stores/shellOverlay';

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
  tabs: Tab[];
  activeTabId: string | null;
  activeSpaceId: string;
  setActiveTab: (id: string | null) => void;
  onReload: () => void;
}) {
  const { removeTab, addTab, moveTab, updateTab, groups, setTabGroup, updateGroup, unloadTab } = useTabStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [contextTabId, setContextTabId] = useState<string | null>(null);
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState('');
  const displayTabs = orderPinnedTabsFirst(tabs);
  const partition = partitionTabsByGroup(displayTabs, groups, activeSpaceId);
  const scopedGroups = partition.groups;

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
    removeTab(id);
    if (isLastTabToClose(allTabs, id)) void window.orbApi?.minimizeCurrentWindow();
  };

  const renderTab = (tab: Tab) => {
    const hostname = getHostname(tab.url);
    const isActive = activeTabId === tab.id;
    return <div key={tab.id} draggable onDragStart={(event) => { setDraggingId(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); }} onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData('text/plain') || draggingId;
      if (!id || id === tab.id) return;
      const allTabs = useTabStore.getState().tabs;
      const targetIndex = allTabs.findIndex((item) => item.id === tab.id);
      const sourceIndex = allTabs.findIndex((item) => item.id === id);
      moveTab(id, activeSpaceId, targetIndex - (sourceIndex < targetIndex ? 1 : 0));
    }} onAuxClick={(event) => { if (event.button === 1) closeTab(tab.id); }} onContextMenu={(event) => { event.preventDefault(); setContextTabId(tab.id); setContextPosition({ x: event.clientX, y: event.clientY }); }} className={`group relative flex h-full shrink-0 items-end ${draggingId === tab.id ? 'opacity-40' : ''}`}>
      <button type="button" role="tab" aria-selected={isActive} aria-label={tab.isPinned ? `Pinned tab: ${tab.title || hostname}` : tab.title || hostname} title={`${tab.title || hostname} · ${hostname}`} onClick={() => setActiveTab(tab.id)} className={`orb-tab relative flex h-[37px] items-center rounded-t-[9px] border border-b-0 text-left transition-colors ${tab.isPinned ? 'w-9 justify-center px-0' : 'min-w-[128px] max-w-[210px] gap-2 px-3 pr-8'} ${isActive ? 'orb-tab-active orb-border' : 'border-transparent'}`}>
        {tab.favicon ? <img src={tab.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} /> : <span className="orb-accent-soft orb-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-md"><Globe aria-hidden="true" className="h-3 w-3" /></span>}
        {!tab.isPinned && <span className="orb-strong min-w-0 flex-1 truncate text-[12px] font-medium">{tab.title || hostname}</span>}
      </button>
      <button type="button" aria-label={`Close ${tab.title || hostname}`} onClick={() => closeTab(tab.id)} className={`orb-control absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${tab.isPinned ? 'right-0' : 'right-1'}`}><X className="h-3 w-3" /></button>
    </div>;
  };

  const startGroupRename = (group: TabGroup) => { setEditingGroupId(group.id); setGroupDraft(group.name); };
  const groupHeader = (group: TabGroup, count: number) => <div key={group.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggingId;
    if (id) setTabGroup(id, group.id);
  }} className="mb-0.5 flex h-9 shrink-0 items-center">
    {editingGroupId === group.id ? <input autoFocus aria-label={`Rename ${group.name} tab group`} value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} onBlur={() => { updateGroup(group.id, { name: groupDraft }); setEditingGroupId(null); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingGroupId(null); }} className="orb-strong h-7 w-28 rounded-md border orb-border bg-[var(--orb-elevated)] px-2 text-[10px] outline-none" /> : <button type="button" aria-expanded={!group.collapsed} title="Double-click to rename · drag a tab here to add it" onClick={() => updateGroup(group.id, { collapsed: !group.collapsed })} onDoubleClick={() => startGroupRename(group)} className="orb-control flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium" style={{ color: group.color }}><FolderSimple className="h-3 w-3" /><span className="max-w-24 truncate">{group.name}</span><span className="orb-muted">{count}</span><CaretDown className={`h-3 w-3 transition-transform ${group.collapsed ? '-rotate-90' : ''}`} /></button>}
  </div>;

  const contextTab = contextTabId ? displayTabs.find((item) => item.id === contextTabId) : undefined;
  const closeRight = contextTab ? getTabsToClose(displayTabs, contextTab.id, 'right') : [];
  useShellOverlay(Boolean(contextTab && contextPosition));

  return <div role="tablist" aria-label="Open tabs" className={`orb-tab-strip orb-sidebar flex shrink-0 items-end gap-1 overflow-x-auto border-b orb-border pt-1 scrollbar-hide ${hasMacTrafficLights ? 'pl-[112px] pr-3' : 'px-3'}`}>
    {partition.pinned.map(renderTab)}
    {scopedGroups.map(({ group, tabs: groupTabs }) => <div key={group.id} role="group" aria-label={`${group.name} tab group`} className="flex shrink-0 items-end gap-1 rounded-t-md px-0.5" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      const id = event.dataTransfer.getData('text/plain') || draggingId;
      if (id) setTabGroup(id, group.id);
    }}>
      {groupHeader(group, groupTabs.length)}
      {!group.collapsed && groupTabs.map(renderTab)}
    </div>)}
    {partition.loose.map(renderTab)}
    <button type="button" onClick={() => handleNewTab()} aria-label="New tab" title="New tab" className="orb-control mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><Plus className="h-4 w-4" /></button>
    {contextTab && contextPosition && <TabContextMenu
      {...contextPosition}
      title={contextTab.title || getHostname(contextTab.url)}
      isPinned={contextTab.isPinned}
      canUnload={contextTab.url !== 'about:blank' && !contextTab.isUnloaded}
      canCloseToRight={closeRight.length > 0}
      onTogglePinned={() => updateTab(contextTab.id, { isPinned: !contextTab.isPinned })}
      onUnload={() => unloadTab(contextTab.id)}
      onCloseTab={() => closeTab(contextTab.id)}
      onCloseToRight={() => handleCloseMany(closeRight)}
      onDismiss={() => { setContextTabId(null); setContextPosition(null); }}
    />}
  </div>;
}
