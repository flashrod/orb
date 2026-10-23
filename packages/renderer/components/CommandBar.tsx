import React, { useEffect, useRef, useState } from 'react';
import { Search, X, ArrowUp, ArrowDown, LogIn, Globe, LayoutDashboard, Plus } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />
      <div
        className="w-full max-w-lg bg-orb-panel border border-white/10 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tabs, spaces, or type a URL..."
              className="w-full bg-transparent text-white placeholder-white/30 text-base outline-none pl-10 pr-4 py-2"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-white/40">No results</div>
            ) : (
              results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={result.action}
                  className={`command-item ${
                    selectedIndex === index ? 'bg-white/10' : ''
                  } hover:bg-white/5`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">
                        {result.title}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {result.subtitle}
                      </div>
                    </div>
                    <div className="text-xs text-white/30">
                      {index === 0 && <LogIn className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
