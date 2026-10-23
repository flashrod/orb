import React, { useState } from 'react';
import { useTabStore } from '../stores/tabs';
import { X } from '@phosphor-icons/react';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'New tab';
  }
}

export default function VerticalTabPanel({
  isOpen,
  embedded = false,
  onClose,
  spaceId,
}: {
  isOpen: boolean;
  embedded?: boolean;
  onClose: () => void;
  spaceId: string;
}) {
  const { tabs, activeTabId, setActiveTab, removeTab, moveTab } = useTabStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const spaceTabs = tabs.filter((t: { spaceId: string }) => t.spaceId === spaceId);
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  if (!isOpen) return null;

  return (
    <div className={embedded ? 'orb-sidebar flex h-full w-[232px] shrink-0 flex-col border-r orb-border' : 'fixed inset-0 z-50 flex justify-end'}>
      {!embedded && <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[2px]" onClick={onClose} />}
      <aside role={embedded ? undefined : 'dialog'} aria-modal={embedded ? undefined : true} aria-label="Vertical tabs" className={`${embedded ? 'orb-sidebar w-full' : 'orb-surface orb-shadow relative z-10 w-80 border-l orb-border'} flex h-full flex-col`}>
        {/* Header */}
        <div className="flex h-11 items-center justify-between border-b orb-border px-4">
          <h3 className="orb-strong text-sm font-medium">Tabs in this space</h3>
          <button
            onClick={onClose}
            aria-label="Close vertical tabs"
            className="orb-control flex h-7 w-7 items-center justify-center rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab List */}
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {spaceTabs.length === 0 ? (
            <div className="orb-muted px-4 py-10 text-center text-xs">
              No tabs in this space
            </div>
          ) : (
            spaceTabs.map((tab) => (
              <div
                key={tab.id}
                draggable
                onDragStart={(event) => { setDraggingId(tab.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', tab.id); }}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain') || draggingId; if (!id || id === tab.id) return; const allTabs = useTabStore.getState().tabs; const targetIndex = allTabs.findIndex((item) => item.id === tab.id); const sourceIndex = allTabs.findIndex((item) => item.id === id); moveTab(id, spaceId, targetIndex - (sourceIndex < targetIndex ? 1 : 0)); }}
                onClick={() => {
                  setActiveTab(tab.id);
                  onClose();
                }}
                className={`orb-vertical-row group flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${draggingId === tab.id ? 'opacity-40' : ''} ${
                  activeTabId === tab.id
                    ? 'orb-accent-soft orb-strong'
                    : 'orb-control'
                }`}
              >
                {tab.favicon ? (
                  <img
                    src={tab.favicon}
                    alt=""
                    className="h-4 w-4 rounded-sm"
                    onError={(e) => (e.target as HTMLImageElement).classList.add('hidden')}
                  />
                ) : (
                  <div className="orb-accent-soft orb-accent flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium">
                    {getHostname(tab.url).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="orb-strong truncate text-sm">{tab.title || getHostname(tab.url)}</div>
                  <div className="orb-muted truncate text-xs">{getHostname(tab.url)}</div>
                </div>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  aria-label={`Close ${tab.title || getHostname(tab.url)}`}
                  className="orb-control flex h-6 w-6 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
