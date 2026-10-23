import React from 'react';
import { useTabStore } from '../stores/tabs';
import { X, ChevronRight } from 'lucide-react';

const FAVICON_CACHE: Record<string, string> = {};

function getFavicon(url: string): string {
  if (FAVICON_CACHE[url]) return FAVICON_CACHE[url];
  try {
    const hostname = new URL(url).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    FAVICON_CACHE[url] = favicon;
    return favicon;
  } catch {
    return '';
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
  const { tabs, setActiveTab, removeTab } = useTabStore();

  const spaceTabs = tabs.filter((t: { spaceId: string }) => t.spaceId === spaceId);
  const activeTabId = useTabStore.getState().activeTabId;

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="w-80 bg-orb-sidebar border-l border-white/5 flex flex-col z-10 transform transition-transform duration-200">
        {/* Header */}
        <div className="h-10 border-b border-white/5 flex items-center justify-between px-4">
          <h3 className="text-sm font-medium text-white">Vertical Tabs</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {spaceTabs.length === 0 ? (
            <div className="text-center py-8 text-xs text-white/40">
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
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTabId === tab.id
                    ? 'bg-white/10 text-orb-accent border-r-2 border-orb-accent'
                    : 'hover:bg-white/5'
                }`}
              >
                {tab.favicon ? (
                  <img
                    src={getFavicon(tab.url)}
                    alt=""
                    className="w-4 h-4 rounded"
                    onError={(e) => (e.target as HTMLImageElement).classList.add('hidden')}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                    {new URL(tab.url).hostname.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{tab.title || new URL(tab.url).hostname}</div>
                  <div className="text-xs text-white/40 truncate">{new URL(tab.url).hostname}</div>
                </div>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
