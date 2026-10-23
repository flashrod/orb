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
    });
  };

  return (
    <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          onMouseDown={(e) => {
            if (e.button === 1) {
              // Middle click to close
              e.preventDefault();
              removeTab(tab.id);
            }
          }}
          className={`${
            activeTabId === tab.id
              ? 'bg-white/10 border-b-2 border-orb-accent pb-[calc(100%-1px)]'
              : ''
          } tab-item flex items-center gap-2 min-w-[100px] group`}
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
          <span className="truncate text-xs text-white/80 group-hover:text-white">
            {tab.title || new URL(tab.url).hostname}
          </span>
          {tab.isPinned && <Pin className="w-3 h-3 text-white/40" />}
          <button
            onClick={(e) => handleCloseTab(e, tab.id)}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={handleNewTab}
        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        title="New Tab (⌘T)"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
}
