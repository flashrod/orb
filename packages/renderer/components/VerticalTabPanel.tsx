import React, { useState } from 'react';
import { useTabStore } from '../stores/tabs';
import { CaretDown, CaretLeft, CaretRight, FolderSimple, Globe, Plus, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react';
import { getTabsToClose, isLastTabToClose, orderPinnedTabsFirst } from '../lib/tabActions';
import TabContextMenu from './TabContextMenu';
import GroupCreateDialog from './GroupCreateDialog';
import { groupTint, nextGroupColor } from '../lib/groupColors';
import { chooseSplitPair } from '../lib/splitView';
import { useSplitViewStore } from '../stores/splitView';
import { useShellOverlay } from '../stores/shellOverlay';
import { partitionTabsByGroup } from '../lib/tabGroups';
import { useAppearanceStore } from '../stores/appearance';
import { isMutedSite, tidyTitle } from '../../shared/siteBehavior';

const hasMacTrafficLights = /Mac/i.test(navigator.platform || navigator.userAgent);

function getHostname(url: string): string {
  try { return new URL(url).hostname || 'New tab'; } catch { return 'New tab'; }
}

export default function VerticalTabPanel({
  isOpen,
  embedded = false,
  compact = false,
  peeked = false,
  onExpand,
  onClose,
  onCollapse,
  onReload,
  spaceId,
  mutedSites = [],
  onToggleMute,
  onToggleSiteMute,
}: {
  isOpen: boolean;
  embedded?: boolean;
  compact?: boolean;
  peeked?: boolean;
  onExpand?: () => void;
  onClose: () => void;
  onCollapse?: () => void;
  onReload: () => void;
  spaceId: string;
  mutedSites?: string[];
  onToggleMute?: (tabId: string) => void;
  onToggleSiteMute?: (tabId: string) => void;
}) {
  const { tabs, activeTabId, setActiveTab, removeTab, moveTab, addTab, updateTab, groups, createGroup, setTabGroup, updateGroup, unloadTab } = useTabStore();
  const sideTabWidth = useAppearanceStore((state) => state.sideTabWidth);
  const setSideTabWidth = useAppearanceStore((state) => state.setSideTabWidth);
  const motion = useAppearanceStore((state) => state.motion);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [contextTabId, setContextTabId] = useState<string | null>(null);
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState('');
  const [groupDraftTabId, setGroupDraftTabId] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);
  const spaceTabs = orderPinnedTabsFirst(tabs.filter((tab) => tab.spaceId === spaceId));
  const groupedTabs = partitionTabsByGroup(spaceTabs, groups, spaceId);
  const splitTabIds = useSplitViewStore((state) => state.tabIds);
  const splitPair = splitTabIds && splitTabIds[0] !== splitTabIds[1] ? splitTabIds : null;
  // Must run before the compact early return below, or the hook order changes.
  useShellOverlay(Boolean(contextTabId && contextPosition));

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

  const renderSplitTab = (first: (typeof spaceTabs)[number], second: (typeof spaceTabs)[number]) => {
    const row = (tab: (typeof spaceTabs)[number], index: 0 | 1) => {
      const hostname = getHostname(tab.url);
      const title = tidyTitle(tab.url, tab.title) || hostname;
      const showsAudio = Boolean(tab.isAudible || tab.isMuted);
      const isActiveHalf = activeTabId === tab.id;
      return <div
        key={tab.id}
        onContextMenu={(event) => { event.preventDefault(); setContextTabId(tab.id); setContextPosition({ x: event.clientX, y: event.clientY }); }}
        className={`group/half flex min-h-9 items-center gap-2 px-2 py-1.5 ${index === 1 ? 'border-t orb-border' : ''} ${isActiveHalf ? 'orb-accent-soft orb-strong' : 'orb-control'}`}
      >
        <button type="button" role="tab" aria-selected={isActiveHalf} onClick={() => setActiveTab(tab.id)} aria-label={title} title={`${title} · ${hostname}`} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {tab.favicon ? <img src={tab.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} /> : <span className="orb-accent-soft orb-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-md"><Globe className="h-3 w-3" /></span>}
          <span className="min-w-0 flex-1">
            <span className="orb-strong block truncate text-xs">{title}</span>
            <span className="orb-muted block truncate text-[10px]">{hostname}</span>
          </span>
        </button>
        {showsAudio && onToggleMute && <button type="button" aria-label={tab.isMuted ? `Unmute ${title}` : `Mute ${title}`} title={tab.isMuted ? 'Muted — click to unmute' : 'Playing audio — click to mute'} onClick={(event) => { event.stopPropagation(); onToggleMute(tab.id); }} className="orb-control flex h-6 w-6 shrink-0 items-center justify-center rounded">{tab.isMuted ? <SpeakerSlash aria-hidden="true" className="orb-muted h-3 w-3" /> : <SpeakerHigh aria-hidden="true" className="orb-accent h-3 w-3" />}</button>}
        <button type="button" aria-label={`Close ${title}`} title={`Close ${title}`} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }} className="orb-control flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity focus:opacity-100 group-hover/half:opacity-100"><X className="h-3 w-3" /></button>
      </div>;
    };
    return <div key={`split-${first.id}-${second.id}`} className="mb-1 overflow-hidden rounded-lg border orb-border">
      {row(first, 0)}
      {row(second, 1)}
    </div>;
  };

  const renderTab = (tab: (typeof spaceTabs)[number], isPinned: boolean) => {
    if (splitPair) {
      if (tab.id === splitPair[0]) {
        const partner = spaceTabs.find((item) => item.id === splitPair[1]);
        if (partner) return renderSplitTab(tab, partner);
      }
      if (tab.id === splitPair[1]) return null;
    }
    const hostname = getHostname(tab.url);
    const title = tidyTitle(tab.url, tab.title) || hostname;
    const group = tab.groupId ? groups.find((item) => item.id === tab.groupId && item.spaceId === spaceId) : undefined;
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
      style={group ? { boxShadow: `inset 2px 0 0 ${group.color}`, backgroundColor: activeTabId === tab.id ? undefined : groupTint(group.color, 16) } : undefined}
      title={`${title} · ${hostname}`}
    >
      {tab.favicon ? <img src={tab.favicon} alt="" className="h-4 w-4 shrink-0 rounded-sm" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} /> : <span className="orb-accent-soft orb-accent flex h-5 w-5 shrink-0 items-center justify-center rounded-md"><Globe className="h-3 w-3" /></span>}
      {!isPinned && <>
        <button type="button" role="tab" aria-selected={activeTabId === tab.id} onClick={() => setActiveTab(tab.id)} aria-label={title} className="flex min-w-0 flex-1 flex-col text-left">
          <span className="orb-strong truncate text-sm">{title}</span>
          <span className="orb-muted truncate text-xs">{hostname}</span>
        </button>
        {(tab.isAudible || tab.isMuted) && onToggleMute && <button type="button" aria-label={tab.isMuted ? `Unmute ${title}` : `Mute ${title}`} title={tab.isMuted ? 'Muted — click to unmute' : 'Playing audio — click to mute'} onClick={(event) => { event.stopPropagation(); onToggleMute(tab.id); }} className="orb-control flex h-6 w-6 items-center justify-center rounded">{tab.isMuted ? <SpeakerSlash aria-hidden="true" className="orb-muted h-3 w-3" /> : <SpeakerHigh aria-hidden="true" className="orb-accent h-3 w-3" />}</button>}
        <button type="button" aria-label={`Close ${title}`} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }} className="orb-control flex h-6 w-6 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><X className="h-3 w-3" /></button>
      </>}
      {isPinned && <button type="button" role="tab" aria-selected={activeTabId === tab.id} aria-label={`Pinned tab: ${title}`} onClick={() => setActiveTab(tab.id)} className="absolute inset-0 rounded-lg" />}
      {isPinned && <button type="button" aria-label={`Close ${title}`} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }} className="orb-control absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"><X className="h-2.5 w-2.5" /></button>}
    </div>;
  };

  if (!isOpen) return null;

  const collapsed = embedded && compact && !peeked;
  const calmTransition = motion === 'off' ? 'none' : 'width 300ms cubic-bezier(0.32, 0.72, 0, 1)';
  const fadeTransition = motion === 'off' ? 'none' : 'opacity 220ms ease-out';

  const contextTab = contextTabId ? spaceTabs.find((tab) => tab.id === contextTabId) : undefined;
  const closeRight = contextTab ? getTabsToClose(spaceTabs, contextTab.id, 'right') : [];

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setResizing(true);
    const startX = event.clientX;
    const startWidth = sideTabWidth;
    const onMove = (moveEvent: PointerEvent) => setSideTabWidth(startWidth + moveEvent.clientX - startX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      setResizing(false);
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return <>
    <div
      style={embedded ? { width: collapsed ? 18 : sideTabWidth, transition: resizing ? 'none' : calmTransition } : undefined}
      className={embedded
        ? 'orb-sidebar relative z-30 flex h-full shrink-0 flex-col overflow-hidden border-r orb-border'
        : 'fixed inset-0 z-50 flex justify-end'}
    >
      {!embedded && <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[2px]" onClick={onClose} />}
      <aside
        role={embedded ? undefined : 'dialog'}
        aria-modal={embedded ? undefined : true}
        aria-label="Vertical tabs"
        aria-hidden={collapsed || undefined}
        style={embedded ? {
          width: sideTabWidth,
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? 'none' : undefined,
          transition: fadeTransition,
        } : { transition: fadeTransition }}
        className={`${embedded ? 'orb-sidebar flex h-full flex-col' : 'orb-surface orb-shadow relative z-10 w-80 border-l orb-border'} flex h-full flex-col`}
      >
        {embedded && hasMacTrafficLights && <div aria-hidden="true" className="h-12 shrink-0" />}
        <div className="flex h-11 items-center justify-between border-b orb-border px-2">
          <div className="flex min-w-0 items-center gap-1">
            {embedded && onCollapse && <button type="button" aria-label="Collapse tab rail" title="Collapse tab rail · ⌘/Ctrl+Shift+E" onClick={onCollapse} className="orb-control flex h-7 w-7 shrink-0 items-center justify-center rounded-md"><CaretLeft className="h-4 w-4" /></button>}
            <h3 className="orb-strong truncate px-1 text-sm font-medium">Tabs</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label="New tab" title="New tab" onClick={() => handleNewTab()} className="orb-control flex h-7 w-7 items-center justify-center rounded-md"><Plus className="h-4 w-4" /></button>
            <button type="button" onClick={onClose} aria-label="Switch to top tabs" title="Switch to top tabs" className="orb-control flex h-7 w-7 items-center justify-center rounded-md"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {spaceTabs.length === 0 ? <div className="orb-muted px-4 py-10 text-center text-xs">No tabs in this space</div> : <>
            {groupedTabs.pinned.length > 0 && <div aria-label="Pinned tabs" className="mb-2 flex flex-wrap gap-1">{groupedTabs.pinned.map((tab) => renderTab(tab, true))}</div>}
            {groupedTabs.groups.map(({ group, tabs: groupTabs }) => <section key={group.id} aria-label={`${group.name} tab group`} className="mb-2 rounded-lg border orb-border p-1.5" style={{ backgroundColor: groupTint(group.color, 7) }}>
              <div className="mb-1 flex h-7 items-center gap-1.5 px-2 text-[11px] font-medium" style={{ color: group.color }}>
                <FolderSimple className="h-3.5 w-3.5" />
                {editingGroupId === group.id ? <input autoFocus aria-label={`Rename ${group.name} tab group`} value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} onBlur={() => { updateGroup(group.id, { name: groupDraft }); setEditingGroupId(null); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingGroupId(null); }} className="orb-strong min-w-0 flex-1 rounded border orb-border bg-[var(--orb-elevated)] px-1 text-[10px] outline-none" /> : <button type="button" aria-expanded={!group.collapsed} title="Click to collapse · double-click to rename" onClick={() => updateGroup(group.id, { collapsed: !group.collapsed })} onDoubleClick={() => { setEditingGroupId(group.id); setGroupDraft(group.name); }} className="orb-control flex min-w-0 flex-1 items-center gap-1 rounded text-left"><span className="min-w-0 flex-1 truncate">{group.name}</span><CaretDown className={`h-3 w-3 transition-transform ${group.collapsed ? '-rotate-90' : ''}`} /></button>}
              </div>
              {!group.collapsed && <div className="space-y-1" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData('text/plain') || draggingId; if (id) setTabGroup(id, group.id); }}>{groupTabs.map((tab) => renderTab(tab, false))}</div>}
            </section>)}
            <div className="space-y-1">{groupedTabs.loose.map((tab) => renderTab(tab, false))}</div>
          </>}
        </div>
      </aside>
      {embedded && compact && (
        <div
          style={{ top: hasMacTrafficLights ? 48 : 0, bottom: 0, transition: fadeTransition }}
          className={`absolute left-0 z-40 flex w-[18px] items-start justify-center pt-2 ${collapsed ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <button type="button" onClick={onExpand} aria-label="Expand tab rail" title="Expand tab rail · ⌘/Ctrl+Shift+E" className="orb-sidebar orb-control flex h-9 w-[18px] items-center justify-center rounded-r-md border border-l-0 orb-border"><CaretRight className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {embedded && !collapsed && (
        <div
          role="separator"
          aria-label="Resize tab rail"
          aria-orientation="vertical"
          title="Drag to resize"
          onPointerDown={startResize}
          className="group absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize"
        >
          <span className="absolute inset-y-0 right-0 w-px bg-transparent transition-colors group-hover:bg-[var(--orb-accent)]" />
          <span className="absolute left-1/2 top-1/2 hidden h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--orb-border-strong)] group-hover:block" />
        </div>
      )}
    </div>
    {contextTab && contextPosition && <TabContextMenu
      {...contextPosition}
      title={contextTab.title || getHostname(contextTab.url)}
      isPinned={contextTab.isPinned}
      canUnload={contextTab.url !== 'about:blank' && !contextTab.isUnloaded}
      canSplit={spaceTabs.length > 1}
      canCloseToRight={closeRight.length > 0}
      onNewTab={() => handleNewTab(contextTab.id)}
      onNewGroup={() => setGroupDraftTabId(contextTab.id)}
      onSplitView={() => {
        const pair = activeTabId ? chooseSplitPair(activeTabId, contextTab.id, spaceTabs.map((item) => item.id)) : null;
        if (pair) useSplitViewStore.getState().open(pair);
      }}
      onTogglePinned={() => updateTab(contextTab.id, { isPinned: !contextTab.isPinned })}
      isMuted={Boolean(contextTab.isMuted)}
      isSiteMuted={isMutedSite(contextTab.url, mutedSites)}
      onToggleMute={onToggleMute ? () => onToggleMute(contextTab.id) : undefined}
      onToggleSiteMute={onToggleSiteMute ? () => onToggleSiteMute(contextTab.id) : undefined}
      onUnload={() => unloadTab(contextTab.id)}
      onCloseTab={() => closeTab(contextTab.id)}
      onCloseToRight={() => handleCloseMany(closeRight)}
      onDismiss={() => { setContextTabId(null); setContextPosition(null); }}
    />}
    {groupDraftTabId && <GroupCreateDialog
      suggestedName={`Group ${groups.filter((group) => group.spaceId === spaceId).length + 1}`}
      initialColor={nextGroupColor(groups.filter((group) => group.spaceId === spaceId).length)}
      onClose={() => setGroupDraftTabId(null)}
      onConfirm={(name, color) => {
        const id = createGroup(spaceId, groupDraftTabId, name);
        if (id) updateGroup(id, { color });
        setGroupDraftTabId(null);
      }}
    />}
  </>;
}
