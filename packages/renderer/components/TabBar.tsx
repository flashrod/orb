import React, { useState } from 'react';
import { CaretDown, Globe, Plus, SpeakerHigh, SpeakerSlash, X, FolderSimple } from '@phosphor-icons/react';
import { useTabStore, Tab, TabGroup } from '../stores/tabs';
import { isMutedSite } from '../../shared/siteBehavior';
import { getTabsToClose, isLastTabToClose, orderPinnedTabsFirst } from '../lib/tabActions';
import { partitionTabsByGroup } from '../lib/tabGroups';
import TabContextMenu from './TabContextMenu';
import GroupCreateDialog from './GroupCreateDialog';
import { groupTint, nextGroupColor } from '../lib/groupColors';
import { chooseSplitPair } from '../lib/splitView';
import { useSplitViewStore } from '../stores/splitView';
import { useShellOverlay } from '../stores/shellOverlay';
import { tidyTitle } from '../../shared/siteBehavior';

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
  mutedSites = [],
  onToggleMute,
  onToggleSiteMute,
}: {
  tabs: Tab[];
  activeTabId: string | null;
  activeSpaceId: string;
  setActiveTab: (id: string | null) => void;
  onReload: () => void;
  mutedSites?: string[];
  onToggleMute: (tabId: string) => void;
  onToggleSiteMute: (tabId: string) => void;
}) {
  const { removeTab, addTab, moveTab, updateTab, groups, createGroup, setTabGroup, updateGroup, unloadTab } = useTabStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [contextTabId, setContextTabId] = useState<string | null>(null);
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState('');
  const [groupDraftTabId, setGroupDraftTabId] = useState<string | null>(null);
  const displayTabs = orderPinnedTabsFirst(tabs);
  const partition = partitionTabsByGroup(displayTabs, groups, activeSpaceId);
  const scopedGroups = partition.groups;
  const groupsInSpace = groups.filter((group) => group.spaceId === activeSpaceId);
  const splitTabIds = useSplitViewStore((state) => state.tabIds);
  const splitPair = splitTabIds && splitTabIds[0] !== splitTabIds[1] ? splitTabIds : null;

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

  const renderSplitTab = (first: Tab, second: Tab) => {
    const half = (tab: Tab, index: 0 | 1) => {
      const hostname = getHostname(tab.url);
      const title = tidyTitle(tab.url, tab.title) || hostname;
      const isActiveHalf = activeTabId === tab.id;
      const showsAudio = Boolean(tab.isAudible || tab.isMuted);
      return <div
        key={tab.id}
        onContextMenu={(event) => { event.preventDefault(); setContextTabId(tab.id); setContextPosition({ x: event.clientX, y: event.clientY }); }}
        className={`group/half relative flex min-w-0 flex-1 items-center gap-1.5 px-2.5 ${index === 1 ? 'border-l orb-border' : ''}`}
      >
        <button type="button" onClick={() => setActiveTab(tab.id)} title={`${title} · ${hostname}`} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          {tab.favicon ? <img src={tab.favicon} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} /> : <Globe aria-hidden="true" className="orb-muted h-3 w-3 shrink-0" />}
          <span className={`min-w-0 flex-1 truncate text-[12px] font-medium ${isActiveHalf ? 'orb-strong' : 'orb-muted'}`}>{title}</span>
        </button>
        {showsAudio && (
          <button
            type="button"
            aria-label={tab.isMuted ? `Unmute ${title}` : `Mute ${title}`}
            title={tab.isMuted ? 'Muted — click to unmute' : 'Playing audio — click to mute'}
            onClick={(event) => { event.stopPropagation(); onToggleMute(tab.id); }}
            className="orb-control flex h-5 w-5 shrink-0 items-center justify-center rounded"
          >
            {tab.isMuted ? <SpeakerSlash aria-hidden="true" className="orb-muted h-3 w-3" /> : <SpeakerHigh aria-hidden="true" className="orb-accent h-3 w-3" />}
          </button>
        )}
        <button type="button" aria-label={`Close ${title}`} title={`Close ${title}`} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }} className="orb-control flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity focus:opacity-100 group-hover/half:opacity-100"><X className="h-3 w-3" /></button>
      </div>;
    };
    const firstTitle = tidyTitle(first.url, first.title) || getHostname(first.url);
    const secondTitle = tidyTitle(second.url, second.title) || getHostname(second.url);
    return <div key={`split-${first.id}-${second.id}`} className="flex h-full shrink-0 items-end">
      <div role="tab" aria-label={`Split view: ${firstTitle} and ${secondTitle}`} title="Split view — click a side to focus it" className="orb-tab orb-tab-active orb-border flex h-[37px] min-w-[300px] max-w-[460px] items-stretch overflow-hidden rounded-t-[9px] border border-b-0">
        {half(first, 0)}
        {half(second, 1)}
      </div>
    </div>;
  };

  const renderTab = (tab: Tab) => {
    if (splitPair) {
      if (tab.id === splitPair[0]) {
        const partner = displayTabs.find((item) => item.id === splitPair[1]);
        if (partner) return renderSplitTab(tab, partner);
      }
      if (tab.id === splitPair[1]) return null;
    }
    const hostname = getHostname(tab.url);
    const title = tidyTitle(tab.url, tab.title) || hostname;
    const isActive = activeTabId === tab.id;
    const showsAudio = Boolean(tab.isAudible || tab.isMuted);
    const group = tab.groupId ? groups.find((item) => item.id === tab.groupId && item.spaceId === activeSpaceId) : undefined;
    return <div key={tab.id} draggable onDragStart={(event) => { setDraggingId(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); }} onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData('text/plain') || draggingId;
      if (!id || id === tab.id) return;
      const allTabs = useTabStore.getState().tabs;
      const targetIndex = allTabs.findIndex((item) => item.id === tab.id);
      const sourceIndex = allTabs.findIndex((item) => item.id === id);
      moveTab(id, activeSpaceId, targetIndex - (sourceIndex < targetIndex ? 1 : 0));
    }} onAuxClick={(event) => { if (event.button === 1) closeTab(tab.id); }} onContextMenu={(event) => { event.preventDefault(); setContextTabId(tab.id); setContextPosition({ x: event.clientX, y: event.clientY }); }} className={`group relative flex h-full shrink-0 items-end ${draggingId === tab.id ? 'opacity-40' : ''}`}>
      <button type="button" role="tab" aria-selected={isActive} aria-label={tab.isPinned ? `Pinned tab: ${title}` : title} title={`${title} · ${hostname}`} onClick={() => setActiveTab(tab.id)} style={group ? { boxShadow: `inset 0 2px 0 ${group.color}`, backgroundColor: isActive ? undefined : groupTint(group.color, 16) } : undefined} className={`orb-tab relative flex h-[37px] items-center rounded-t-[9px] border border-b-0 text-left transition-colors ${tab.isPinned ? 'w-9 justify-center px-0' : `min-w-[128px] max-w-[210px] gap-2 px-3 ${showsAudio ? 'pr-12' : 'pr-8'}`} ${isActive ? 'orb-tab-active orb-border' : 'border-transparent'}`}>
        {tab.favicon ? <img src={tab.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} /> : <span className="orb-accent-soft orb-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-md"><Globe aria-hidden="true" className="h-3 w-3" /></span>}
        {!tab.isPinned && <span className="orb-strong min-w-0 flex-1 truncate text-[12px] font-medium">{title}</span>}
      </button>
      {showsAudio && (
        <button
          type="button"
          aria-label={tab.isMuted ? `Unmute ${title}` : `Mute ${title}`}
          title={tab.isMuted ? 'Muted — click to unmute' : 'Playing audio — click to mute'}
          onClick={(event) => { event.stopPropagation(); onToggleMute(tab.id); }}
          className={`orb-control absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded ${tab.isPinned ? 'right-0' : 'right-6'}`}
        >
          {tab.isMuted
            ? <SpeakerSlash aria-hidden="true" className="orb-muted h-3 w-3" />
            : <SpeakerHigh aria-hidden="true" className="orb-accent h-3 w-3" />}
        </button>
      )}
      <button type="button" aria-label={`Close ${title}`} onClick={() => closeTab(tab.id)} className={`orb-control absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${tab.isPinned ? 'right-0' : 'right-1'}`}><X className="h-3 w-3" /></button>
    </div>;
  };

  const startGroupRename = (group: TabGroup) => { setEditingGroupId(group.id); setGroupDraft(group.name); };
  const groupHeader = (group: TabGroup) => <div key={group.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggingId;
    if (id) setTabGroup(id, group.id);
  }} className="mb-0.5 flex h-9 shrink-0 items-center">
    {editingGroupId === group.id ? <input autoFocus aria-label={`Rename ${group.name} tab group`} value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} onBlur={() => { updateGroup(group.id, { name: groupDraft }); setEditingGroupId(null); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingGroupId(null); }} className="orb-strong h-7 w-28 rounded-md border orb-border bg-[var(--orb-elevated)] px-2 text-[10px] outline-none" /> : <button type="button" aria-expanded={!group.collapsed} title="Double-click to rename · drag a tab here to add it" onClick={() => updateGroup(group.id, { collapsed: !group.collapsed })} onDoubleClick={() => startGroupRename(group)} className="orb-control flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium" style={{ color: group.color, backgroundColor: groupTint(group.color, 16) }}><FolderSimple className="h-3 w-3" /><span className="max-w-24 truncate">{group.name}</span><CaretDown className={`h-3 w-3 transition-transform ${group.collapsed ? '-rotate-90' : ''}`} /></button>}
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
      {groupHeader(group)}
      {!group.collapsed && groupTabs.map(renderTab)}
    </div>)}
    {partition.loose.map(renderTab)}
    <button type="button" onClick={() => handleNewTab()} aria-label="New tab" title="New tab" className="orb-control mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><Plus className="h-4 w-4" /></button>
    {contextTab && contextPosition && <TabContextMenu
      {...contextPosition}
      title={contextTab.title || getHostname(contextTab.url)}
      isPinned={contextTab.isPinned}
      canUnload={contextTab.url !== 'about:blank' && !contextTab.isUnloaded}
      canSplit={displayTabs.length > 1}
      canCloseToRight={closeRight.length > 0}
      onNewTab={() => handleNewTab(contextTab.id)}
      onNewGroup={() => setGroupDraftTabId(contextTab.id)}
      onSplitView={() => {
        const pair = activeTabId ? chooseSplitPair(activeTabId, contextTab.id, displayTabs.map((item) => item.id)) : null;
        if (pair) useSplitViewStore.getState().open(pair);
      }}
      onTogglePinned={() => updateTab(contextTab.id, { isPinned: !contextTab.isPinned })}
      isMuted={Boolean(contextTab.isMuted)}
      isSiteMuted={isMutedSite(contextTab.url, mutedSites)}
      onToggleMute={() => onToggleMute(contextTab.id)}
      onToggleSiteMute={() => onToggleSiteMute(contextTab.id)}
      onUnload={() => unloadTab(contextTab.id)}
      onCloseTab={() => closeTab(contextTab.id)}
      onCloseToRight={() => handleCloseMany(closeRight)}
      onDismiss={() => { setContextTabId(null); setContextPosition(null); }}
    />}
    {groupDraftTabId && <GroupCreateDialog
      suggestedName={`Group ${groupsInSpace.length + 1}`}
      initialColor={nextGroupColor(groupsInSpace.length)}
      onClose={() => setGroupDraftTabId(null)}
      onConfirm={(name, color) => {
        const id = createGroup(activeSpaceId, groupDraftTabId, name);
        if (id) updateGroup(id, { color });
        setGroupDraftTabId(null);
      }}
    />}
  </div>;
}
