import React from 'react';
import { useTabStore } from '../stores/tabs';
import { X, Pin, RefreshCw } from 'lucide-react';

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
  const { removeTab, addTab } = useTabStore();

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
  };

  const handleNewTab = () => {
    addTab({
      spaceId: activeSpaceId,
      url: 'https://orb.newtab',
      title: 'New Tab',
      favicon: '',
      isPinned: false,
      isActive: true,
    });
  };

  return (
    <div className="h-10 border-b border-zinc-200 bg-white flex items-center px-3 gap-2 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          onMouseDown={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              removeTab(tab.id);
            }
          }}
          className={`${
            activeTabId === tab.id
              ? 'bg-zinc-900 border-b-2 border-zinc-900 pb-[calc(100%-1px)]'
              : ''
          } zen-tab-item flex items-center gap-2 min-w-[100px] group`}
        >
          {tab.favicon ? (
            <img
              src={getFavicon(tab.url)}
              alt=""
              className="w-4 h-4 rounded-sm"
              onError={(e) => (e.target as HTMLImageElement).classList.add('hidden')}
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-600">
              {new URL(tab.url).hostname.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="truncate text-xs text-zinc-600 group-hover:text-zinc-900">
            {tab.title || new URL(tab.url).hostname}
          </span>
          {tab.isPinned && <Pin className="w-3 h-3 text-zinc-400" />}
          <button
            onClick={(e) => handleCloseTab(e, tab.id)}
            className="w-5 h-5 rounded-sm hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={handleNewTab}
        className="w-7 h-7 rounded-sm hover:bg-zinc-50 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
        title="New Tab (⌘T)"
      >
        <RefreshCw className="w-3 h-3 text-zinc-500" />
      </button>
    </div>
  );
}
