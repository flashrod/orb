import React, { useState } from 'react';
import { useTabStore } from '../stores/tabs';
import { CaretDown, CaretLeft, CaretRight, FolderSimple, Globe, Plus, SpeakerSlash, X } from '@phosphor-icons/react';
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

function tabTitle(tab: { url: string; title: string }): string {
  return tidyTitle(tab.url, tab.title) || getHostname(tab.url);
}

function AudioIndicator({ muted }: { muted: boolean }) {
  if (muted) return <SpeakerSlash aria-hidden="true" className="orb-muted h-3.5 w-3.5" />;
  return (
    <span aria-hidden="true" className="orb-audio-bars">
      <span />
      <span />
      <span />
    </span>
  );
}

function Favicon({ tab, size = 'md' }: { tab: { url: string; favicon: string }; size?: 'md' | 'sm' }) {
  const box = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  if (tab.favicon) {
    return <img src={tab.favicon} alt="" className={`${box} shrink-0 rounded-[3px] object-contain`} onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />;
  }
  return (
    <span className={`orb-accent-soft orb-accent flex ${box} shrink-0 items-center justify-center rounded-[5px]`}>
      <Globe className="h-3 w-3" />
    </span>
  );
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
  fullscreen = false,
  onOpenSplitPicker,
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
  fullscreen?: boolean;
  onOpenSplitPicker?: (tabId: string) => void;
}) {
  const { tabs, activeTabId, setActiveTab, removeTab, moveTab, addTab, updateTab, groups, createGroup, setTabGroup, updateGroup, unloadTab } = useTabStore();
  const sideTabWidth = useAppearanceStore((state) => state.sideTabWidth);
  const setSideTabWidth = useAppearanceStore((state) => state.setSideTabWidth);
  const motion = useAppearanceStore((state) => state.motion);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
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

  const openContext = (event: React.MouseEvent, tabId: string) => {
    event.preventDefault();
    setContextTabId(tabId);
    setContextPosition({ x: event.clientX, y: event.clientY });
  };

  const audioButton = (tab: (typeof spaceTabs)[number]) => {
    if (!(tab.isAudible || tab.isMuted) || !onToggleMute) return null;
    const title = tabTitle(tab);
    return (
      <button
        type="button"
        aria-label={tab.isMuted ? `Unmute ${title}` : `Mute ${title}`}
        title={tab.isMuted ? 'Muted — click to unmute' : 'Playing audio — click to mute'}
        onClick={(event) => { event.stopPropagation(); onToggleMute(tab.id); }}
        className="orb-control flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
      >
        <AudioIndicator muted={Boolean(tab.isMuted)} />
      </button>
    );
  };

  const closeButton = (tab: (typeof spaceTabs)[number], scope: string) => {
    const title = tabTitle(tab);
    return (
      <button
        type="button"
        aria-label={`Close ${title}`}
        title={`Close ${title}`}
        onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}
        className={`orb-control flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity focus-visible:opacity-100 ${scope}`}
      >
        <X className="h-3 w-3" />
      </button>
    );
  };

  const renderSplitTab = (first: (typeof spaceTabs)[number], second: (typeof spaceTabs)[number]) => {
    const row = (tab: (typeof spaceTabs)[number], index: 0 | 1) => {
      const title = tabTitle(tab);
      const isActiveHalf = activeTabId === tab.id;
      return (
        <div
          key={tab.id}
          onContextMenu={(event) => openContext(event, tab.id)}
          className={`group/half relative flex h-9 items-center gap-2 pl-2.5 pr-1.5 ${index === 1 ? 'border-t orb-border' : ''} ${isActiveHalf ? 'orb-elevated orb-strong shadow-sm' : 'orb-control'}`}
        >
          {isActiveHalf && <span aria-hidden="true" className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-[var(--orb-accent)]" />}
          <Favicon tab={tab} size="sm" />
          <button type="button" role="tab" aria-selected={isActiveHalf} onClick={() => setActiveTab(tab.id)} aria-label={title} title={`${title} · ${getHostname(tab.url)}`} className="flex min-w-0 flex-1 items-center text-left">
            <span className="orb-strong block truncate text-[13px] font-medium leading-5">{title}</span>
          </button>
          {audioButton(tab)}
          {closeButton(tab, 'group-hover/half:opacity-100')}
        </div>
      );
    };
    return (
      <div key={`split-${first.id}-${second.id}`} className="mb-1 overflow-hidden rounded-[10px] border orb-border bg-[var(--orb-surface)]/40">
        {row(first, 0)}
        {row(second, 1)}
      </div>
    );
  };

  const renderTab = (tab: (typeof spaceTabs)[number], isPinned: boolean) => {
    if (splitPair) {
      if (tab.id === splitPair[0]) {
        const partner = spaceTabs.find((item) => item.id === splitPair[1]);
        if (partner) return renderSplitTab(tab, partner);
      }
      if (tab.id === splitPair[1]) return null;
    }
    const title = tabTitle(tab);
    const hostname = getHostname(tab.url);
    const group = tab.groupId ? groups.find((item) => item.id === tab.groupId && item.spaceId === spaceId) : undefined;
    const showsAudio = Boolean(tab.isAudible || tab.isMuted);

    if (isPinned) {
      return (
        <div
          key={tab.id}
          className="group/pin relative"
          draggable
          onDragStart={(event) => { setDraggingId(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); }}
          onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
          onDragOver={(event) => { event.preventDefault(); if (dragOverId !== tab.id) setDragOverId(tab.id); }}
          onDragLeave={() => setDragOverId((current) => (current === tab.id ? null : current))}
          onDrop={(event) => { event.preventDefault(); setDragOverId(null); const id = event.dataTransfer.getData('text/plain') || draggingId; if (!id || id === tab.id) return; const allTabs = useTabStore.getState().tabs; const targetIndex = allTabs.findIndex((item) => item.id === tab.id); const sourceIndex = allTabs.findIndex((item) => item.id === id); moveTab(id, spaceId, targetIndex - (sourceIndex < targetIndex ? 1 : 0)); }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-label={`Pinned tab: ${title}`}
            title={`${title} · ${hostname}`}
            onClick={() => setActiveTab(tab.id)}
            onAuxClick={(event) => { if (event.button === 1) closeTab(tab.id); }}
            onContextMenu={(event) => openContext(event, tab.id)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors ${activeTabId === tab.id ? 'orb-elevated orb-strong shadow-sm ring-1 ring-[var(--orb-border)]' : 'orb-control'} ${draggingId === tab.id ? 'opacity-40' : ''}`}
          >
            <Favicon tab={tab} />
            {dragOverId === tab.id && <span aria-hidden="true" className="absolute inset-x-1 -top-[3px] h-[2px] rounded-full bg-[var(--orb-accent)]" />}
          </button>
          {showsAudio && onToggleMute && (
            <button
              type="button"
              aria-label={tab.isMuted ? `Unmute ${title}` : `Mute ${title}`}
              title={tab.isMuted ? 'Muted — click to unmute' : 'Playing audio — click to mute'}
              onClick={(event) => { event.stopPropagation(); onToggleMute(tab.id); }}
              className="orb-elevated absolute -bottom-1 -left-1 z-10 flex h-[17px] w-[17px] items-center justify-center rounded-full shadow-sm ring-1 ring-[var(--orb-border)]"
            >
              {tab.isMuted ? <SpeakerSlash aria-hidden="true" className="orb-muted h-2.5 w-2.5" /> : <span className="orb-audio-bars scale-[0.6]"><span /><span /><span /></span>}
            </button>
          )}
          <button
            type="button"
            aria-label={`Close ${title}`}
            title={`Close ${title}`}
            onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}
            className="orb-elevated orb-control absolute -right-1 -top-1 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full opacity-0 shadow-sm ring-1 ring-[var(--orb-border)] transition-opacity focus-visible:opacity-100 group-hover/pin:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      );
    }

    return (
      <div
        key={tab.id}
        draggable
        onDragStart={(event) => { setDraggingId(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); }}
        onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
        onDragOver={(event) => { event.preventDefault(); if (dragOverId !== tab.id) setDragOverId(tab.id); }}
        onDragLeave={() => setDragOverId((current) => (current === tab.id ? null : current))}
        onDrop={(event) => { event.preventDefault(); setDragOverId(null); const id = event.dataTransfer.getData('text/plain') || draggingId; if (!id || id === tab.id) return; const allTabs = useTabStore.getState().tabs; const targetIndex = allTabs.findIndex((item) => item.id === tab.id); const sourceIndex = allTabs.findIndex((item) => item.id === id); moveTab(id, spaceId, targetIndex - (sourceIndex < targetIndex ? 1 : 0)); }}
        onAuxClick={(event) => { if (event.button === 1) closeTab(tab.id); }}
        onContextMenu={(event) => openContext(event, tab.id)}
        className={`group/row relative flex h-9 cursor-pointer items-center gap-2.5 rounded-[10px] pl-2.5 pr-1.5 transition-colors ${draggingId === tab.id ? 'opacity-40' : ''} ${activeTabId === tab.id ? 'orb-elevated orb-strong shadow-sm' : 'orb-control'}`}
        style={group ? { boxShadow: activeTabId === tab.id ? undefined : `inset 2px 0 0 ${group.color}`, backgroundColor: activeTabId === tab.id ? undefined : groupTint(group.color, 14) } : undefined}
        title={`${title} · ${hostname}`}
      >
        {dragOverId === tab.id && <span aria-hidden="true" className="absolute inset-x-2 -top-[3px] h-[2px] rounded-full bg-[var(--orb-accent)]" />}
        {activeTabId === tab.id && <span aria-hidden="true" className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-[var(--orb-accent)]" />}
        <Favicon tab={tab} />
        <button
          type="button"
          role="tab"
          aria-selected={activeTabId === tab.id}
          onClick={() => setActiveTab(tab.id)}
          aria-label={title}
          className={`flex min-w-0 flex-1 items-center text-left outline-none focus-visible:ring-1 focus-visible:ring-[var(--orb-accent)] ${tab.isUnloaded ? 'opacity-60' : ''}`}
        >
          <span className="orb-strong truncate text-[13px] font-medium leading-5">{title}</span>
        </button>
        {audioButton(tab)}
        {closeButton(tab, 'group-hover/row:opacity-100')}
      </div>
    );
  };

  if (!isOpen) return null;

  const collapsed = embedded && compact && !peeked;
  const calmTransition = motion === 'off' ? 'none' : 'width 300ms cubic-bezier(0.32, 0.72, 0, 1)';
  const fadeTransition = motion === 'off' ? 'none' : 'opacity 220ms ease-out';
  // The macOS traffic lights span ~52px from x=16. A 44px rail put them half
  // over the toolbar; 72px keeps all three buttons on the rail.
  const railWidth = 72;

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
      style={embedded ? { width: collapsed ? railWidth : sideTabWidth, transition: resizing ? 'none' : calmTransition } : undefined}
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
        {embedded && hasMacTrafficLights && !fullscreen && <div aria-hidden="true" className="h-10 shrink-0" />}
        <div className="flex h-10 shrink-0 items-center justify-between border-b orb-border px-2">
          <div className="flex min-w-0 items-center gap-1">
            {embedded && onCollapse && <button type="button" aria-label="Collapse tab rail" title="Collapse tab rail · ⌘/Ctrl+Shift+E" onClick={onCollapse} className="orb-control flex h-7 w-7 shrink-0 items-center justify-center rounded-md"><CaretLeft className="h-4 w-4" /></button>}
            <h3 className="orb-strong truncate px-1 text-[13px] font-semibold tracking-[-0.01em]">Tabs</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label="New tab" title="New tab" onClick={() => handleNewTab()} className="orb-control flex h-7 w-7 items-center justify-center rounded-md"><Plus className="h-4 w-4" /></button>
            <button type="button" onClick={onClose} aria-label="Switch to top tabs" title="Switch to top tabs" className="orb-control flex h-7 w-7 items-center justify-center rounded-md"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="orb-rail-scroll flex-1 overflow-y-auto px-2 py-2">
          {spaceTabs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <span className="orb-accent-soft orb-accent flex h-9 w-9 items-center justify-center rounded-xl"><Globe className="h-4 w-4" /></span>
              <p className="orb-muted text-xs">No tabs in this space</p>
              <button type="button" onClick={() => handleNewTab()} className="orb-control rounded-md border orb-border px-2.5 py-1 text-[11px]">New tab</button>
            </div>
          ) : <>
            {groupedTabs.pinned.length > 0 && (
              <div className="mb-2">
                <div className="orb-muted px-1.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">Pinned</div>
                <div aria-label="Pinned tabs" className="flex flex-wrap gap-1">{groupedTabs.pinned.map((tab) => renderTab(tab, true))}</div>
              </div>
            )}
            {groupedTabs.groups.map(({ group, tabs: groupTabs }) => (
              <section key={group.id} aria-label={`${group.name} tab group`} className="mb-1.5 rounded-xl px-1 py-1" style={{ backgroundColor: groupTint(group.color, 7) }}>
                <div className="flex h-8 items-center gap-1 px-1">
                  <button
                    type="button"
                    aria-expanded={!group.collapsed}
                    aria-label={`${group.collapsed ? 'Expand' : 'Collapse'} ${group.name} tab group`}
                    onClick={() => updateGroup(group.id, { collapsed: !group.collapsed })}
                    className="orb-control flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  >
                    <CaretDown className={`h-3.5 w-3.5 transition-transform ${group.collapsed ? '-rotate-90' : ''}`} />
                  </button>
                  <FolderSimple className="h-3.5 w-3.5 shrink-0" style={{ color: group.color }} />
                  {editingGroupId === group.id ? (
                    <input
                      autoFocus
                      aria-label={`Rename ${group.name} tab group`}
                      value={groupDraft}
                      onChange={(event) => setGroupDraft(event.target.value)}
                      onBlur={() => { updateGroup(group.id, { name: groupDraft.trim() || group.name }); setEditingGroupId(null); }}
                      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingGroupId(null); }}
                      className="orb-strong min-w-0 flex-1 rounded-md border orb-border bg-[var(--orb-elevated)] px-1.5 py-0.5 text-[11px] outline-none focus-visible:ring-1 focus-visible:ring-[var(--orb-accent)]"
                    />
                  ) : (
                    <button
                      type="button"
                      title="Double-click to rename"
                      onDoubleClick={() => { setEditingGroupId(group.id); setGroupDraft(group.name); }}
                      className="orb-strong min-w-0 flex-1 truncate rounded text-left text-[11px] font-semibold"
                      style={{ color: group.color }}
                    >
                      {group.name}
                    </button>
                  )}
                </div>
                {!group.collapsed && (
                  <div className="space-y-0.5 pl-1" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData('text/plain') || draggingId; if (id) setTabGroup(id, group.id); }}>
                    {groupTabs.map((tab) => renderTab(tab, false))}
                  </div>
                )}
              </section>
            ))}
            <div className="space-y-0.5">{groupedTabs.loose.map((tab) => renderTab(tab, false))}</div>
            <button
              type="button"
              onClick={() => handleNewTab()}
              className="orb-control group/new mt-1 flex h-9 w-full items-center gap-2.5 rounded-[10px] pl-2.5 pr-1.5 text-left"
            >
              <span className="orb-border flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-dashed"><Plus className="h-3 w-3" /></span>
              <span className="text-[12px] font-medium">New tab</span>
            </button>
          </>}
        </div>
      </aside>
      {embedded && compact && (
        <div
          aria-label="Collapsed tabs"
          style={{ paddingTop: fullscreen ? 8 : hasMacTrafficLights ? 44 : 8, transition: fadeTransition }}
          className={`orb-sidebar absolute inset-y-0 left-0 z-40 flex w-[72px] flex-col items-center border-r orb-border pb-2 ${collapsed ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <button type="button" onClick={onExpand} aria-label="Expand tab rail" title="Expand tab rail · ⌘/Ctrl+Shift+E" className="orb-control flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><CaretRight className="h-4 w-4" /></button>
          <div className="orb-rail-scroll mt-2 flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5">
            {spaceTabs.map((tab) => {
              const title = tabTitle(tab);
              const showsAudio = Boolean(tab.isAudible || tab.isMuted);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  onContextMenu={(event) => openContext(event, tab.id)}
                  aria-label={title}
                  title={`${title} · ${getHostname(tab.url)}`}
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${activeTabId === tab.id ? 'orb-elevated orb-strong shadow-sm ring-1 ring-[var(--orb-border)]' : 'orb-control'}`}
                >
                  <Favicon tab={tab} size="sm" />
                  {showsAudio && <span aria-hidden="true" className={`absolute bottom-[3px] right-[3px] h-1.5 w-1.5 rounded-full ${tab.isMuted ? 'bg-[var(--orb-text-muted)]' : 'bg-[var(--orb-accent)]'}`} />}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => handleNewTab()} aria-label="New tab" title="New tab" className="orb-control mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"><Plus className="h-4 w-4" /></button>
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
        if (onOpenSplitPicker) {
          onOpenSplitPicker(contextTab.id);
          return;
        }
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
