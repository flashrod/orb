import React, { useEffect, useRef, useState } from 'react';
import { Search, X, LogIn, Globe, LayoutDashboard, Plus } from 'lucide-react';
import { useTabStore } from '../stores/tabs';
import { useSpaceStore } from '../stores/spaces';

interface CommandResult {
  id: string;
  type: 'tab' | 'space' | 'command' | 'url';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
  host?: string;
  url?: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  globe: Globe,
  dashboard: LayoutDashboard,
  search: Search,
  plus: Plus,
};

function getIcon(name: string, className?: string) {
  const Icon = ICONS[name] || Globe;
  return <Icon className={className} />;
}

export default function CommandBar({
  onClose,
}: {
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tabs, activeTabId } = useTabStore();
  const { spaces, activeSpaceId } = useSpaceStore();

  useEffect(() => {
    inputRef.current?.focus();
    setResults(buildResults(query));
    setSelectedIndex(-1);
  }, [query, tabs, spaces, activeTabId, activeSpaceId]);

  const buildResults = (q: string): CommandResult[] => {
    const lower = q.toLowerCase().trim();
    const results: CommandResult[] = [];

    // 1. Open tabs (dedup by host - show most recent tab per host)
    const tabResults = buildTabResults(lower);
    results.push(...tabResults);

    // 2. Spaces
    const spaceResults = buildSpaceResults(lower);
    results.push(...spaceResults);

    // 3. Commands
    if (!lower) {
      results.push(
        {
          id: 'cmd-new-tab',
          type: 'command',
          title: 'New Tab',
          subtitle: 'Open a new tab (⌘T)',
          icon: getIcon('plus', 'w-4 h-4'),
          action: () => {
            window.dispatchEvent(new CustomEvent('orb:new-tab'));
            onClose();
          },
        },
        {
          id: 'cmd-new-space',
          type: 'command',
          title: 'New Space',
          subtitle: 'Create a new browsing space',
          icon: getIcon('dashboard', 'w-4 h-4'),
          action: () => {
            window.dispatchEvent(new CustomEvent('orb:new-space'));
            onClose();
          },
        },
        {
          id: 'cmd-devtools',
          type: 'command',
          title: 'Developer Tools',
          subtitle: 'Open DevTools (⌘⌥I)',
          icon: getIcon('search', 'w-4 h-4'),
          action: () => {
            window.dispatchEvent(new CustomEvent('orb:toggle-devtools'));
            onClose();
          },
        }
      );
    } else {
      // URL navigation - treat query as URL/search
      const url = lower.includes('://') || lower.includes('.') ? lower : `https://www.google.com/search?q=${encodeURIComponent(lower)}`;
      results.push({
        id: 'cmd-navigate',
        type: 'url',
        title: lower.includes(' ') ? `Search for "${lower}"` : `Go to ${lower}`,
        subtitle: url,
        icon: getIcon('globe', 'w-4 h-4'),
        action: () => {
          window.dispatchEvent(new CustomEvent('orb:navigate', { detail: { url } }));
          onClose();
        },
        url,
      });
    }

    return results;
  };

  const buildTabResults = (q: string): CommandResult[] => {
    const tabsCopy = [...tabs].reverse(); // most recent first
    const seenHosts = new Set<string>();
    const results: CommandResult[] = [];

    for (const tab of tabsCopy) {
      if (!tab.title.toLowerCase().includes(q) && !tab.url.toLowerCase().includes(q)) continue;

      const host = new URL(tab.url).hostname;
      if (seenHosts.has(host)) continue; // dedup by host
      seenHosts.add(host);

      results.push({
        id: `tab-${tab.id}`,
        type: 'tab',
        title: tab.title || host,
        subtitle: host,
        icon: getIcon('globe', 'w-4 h-4'),
        action: () => {
          const { setActiveTab } = useTabStore.getState();
          setActiveTab(tab.id);
          onClose();
        },
        host,
        url: tab.url,
      });

      if (results.length >= 8) break; // limit tab results
    }

    return results;
  };

  const buildSpaceResults = (q: string): CommandResult[] => {
    return spaces
      .filter((s) => s.name.toLowerCase().includes(q))
      .map((space) => ({
        id: `space-${space.id}`,
        type: 'space',
        title: space.name,
        subtitle: 'Space',
        icon: getIcon(space.icon, 'w-4 h-4'),
        action: () => {
          const { setActiveSpace } = useSpaceStore.getState();
          setActiveSpace(space.id);
          onClose();
        },
      }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[selectedIndex] || results[0];
      if (selected) {
        selected.action();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-stone-900/20 px-4 pt-[14vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Orb command bar"
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-stone-200 bg-stone-50 shadow-[0_16px_48px_rgba(41,37,36,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <div className="relative mb-2 border-b border-stone-200 pb-2">
            <Search aria-hidden="true" className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              ref={inputRef}
              aria-label="Search tabs, spaces, or enter a URL"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tabs, spaces, or type a URL..."
              className="w-full bg-transparent py-2 pl-9 pr-9 text-sm text-stone-800 outline-none placeholder:text-stone-400"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto" role="listbox" aria-label="Command results">
            {results.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-stone-500">No matching tabs or spaces</div>
            ) : (
              results.map((result, index) => (
                <div
                  key={result.id}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onClick={result.action}
                  className={`flex cursor-pointer items-center rounded-md px-3 py-2 transition-colors ${
                    selectedIndex === index ? 'bg-stone-200/80' : 'hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-200/70 text-stone-600">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-stone-800">
                        {result.title}
                      </div>
                      <div className="truncate text-xs text-stone-500">
                        {result.subtitle}
                      </div>
                    </div>
                    <div className="ml-auto pl-3 text-stone-400">
                      {index === 0 && <LogIn aria-hidden="true" className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 border-t border-stone-200 px-4 py-2 text-[11px] text-stone-400">
          <span><kbd className="font-medium text-stone-500">↑ ↓</kbd> Navigate</span>
          <span><kbd className="font-medium text-stone-500">↵</kbd> Open</span>
          <span><kbd className="font-medium text-stone-500">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
