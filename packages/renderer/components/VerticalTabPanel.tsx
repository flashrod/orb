import React from 'react';
import { useTabStore } from '../stores/tabs';
import { X, ChevronRight } from 'lucide-react';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'New tab';
  }
}

export default function VerticalTabPanel({
  isOpen,
  onClose,
  spaceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
}) {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabStore();

  const spaceTabs = tabs.filter((t: { spaceId: string }) => t.spaceId === spaceId);
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <aside role="dialog" aria-modal="true" aria-label="Vertical tabs" className="relative z-10 flex w-80 flex-col border-l border-stone-200 bg-stone-50 shadow-[-12px_0_40px_rgba(41,37,36,0.08)]">
        {/* Header */}
        <div className="flex h-11 items-center justify-between border-b border-stone-200 px-4">
          <h3 className="text-sm font-medium text-stone-800">Tabs in this space</h3>
          <button
            onClick={onClose}
            aria-label="Close vertical tabs"
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab List */}
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {spaceTabs.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-stone-500">
              No tabs in this space
            </div>
          ) : (
            spaceTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  onClose();
                }}
                className={`group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                  activeTabId === tab.id
                    ? 'bg-stone-200/70 text-stone-900'
                    : 'text-stone-700 hover:bg-stone-100'
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
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-200 text-[9px] font-medium text-stone-600">
                    {getHostname(tab.url).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm text-stone-800">{tab.title || getHostname(tab.url)}</div>
                  <div className="truncate text-xs text-stone-500">{getHostname(tab.url)}</div>
                </div>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  aria-label={`Close ${tab.title || getHostname(tab.url)}`}
                  className="flex h-6 w-6 items-center justify-center rounded text-stone-400 opacity-0 transition-opacity hover:bg-stone-200 hover:text-stone-800 group-hover:opacity-100"
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
