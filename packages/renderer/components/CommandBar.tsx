import React, { useEffect, useRef, useState } from 'react';
import { ClockCounterClockwise, MagnifyingGlass, X, SignIn, Globe, SquaresFour, Plus } from '@phosphor-icons/react';
import { useTabStore } from '../stores/tabs';
import { useSpaceStore } from '../stores/spaces';
import { useProfileStore } from '../stores/profiles';
import { useBrowserPreferencesStore } from '../stores/preferences';
import { resolveAddressOrSearch } from '../lib/navigation';
import { countRestorableTabs, restoreLastSession } from '../lib/restoreSession';

interface CommandResult {
  id: string;
  type: 'tab' | 'space' | 'profile' | 'command' | 'url' | 'history';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
  host?: string;
  url?: string;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  globe: Globe,
  dashboard: SquaresFour,
  search: MagnifyingGlass,
  plus: Plus,
  history: ClockCounterClockwise,
};

function getIcon(name: string, className?: string) {
  const Icon = ICONS[name] || Globe;
  return <Icon className={className} />;
}

export default function CommandBar({
  onClose,
  onOpenSettings,
}: {
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [historyResults, setHistoryResults] = useState<CommandResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tabs, activeTabId } = useTabStore();
  const { spaces, activeSpaceId } = useSpaceStore();
  const profiles = useProfileStore((state) => state.profiles);
  const searchProvider = useBrowserPreferencesStore((state) => state.searchProvider);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setResults(buildResults(query));
    setSelectedIndex(-1);
  }, [query, tabs, spaces, profiles, activeTabId, activeSpaceId, searchProvider, historyResults]);

  useEffect(() => {
    const text = query.trim();
    if (!text || !window.orbApi?.queryHistory) {
      setHistoryResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void window.orbApi.queryHistory(text, 6).then((entries) => {
        if (cancelled) return;
        setHistoryResults(entries.map((entry) => ({
          id: `history-${entry.url}`,
          type: 'history' as const,
          title: entry.title || entry.host,
          subtitle: `${entry.host} · History`,
          icon: getIcon('history', 'w-4 h-4'),
          action: () => {
            window.dispatchEvent(new CustomEvent('orb:navigate', { detail: { url: entry.url } }));
            onClose();
          },
          host: entry.host,
          url: entry.url,
        })));
      }).catch(() => undefined);
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, onClose]);

  const buildResults = (q: string): CommandResult[] => {
    const lower = q.toLowerCase().trim();
    const results: CommandResult[] = [];

    // 1. Open tabs (dedup by host - show most recent tab per host)
    const tabResults = buildTabResults(lower);
    results.push(...tabResults);

    // 2. History (already filtered and ranked by the main process)
    results.push(...historyResults);

    // 3. Spaces
    const spaceResults = buildSpaceResults(lower);
    results.push(...spaceResults);

    results.push(...profiles
      .filter((profile) => profile.name.toLowerCase().includes(lower))
      .map((profile) => ({
        id: `profile-${profile.id}`,
        type: 'profile' as const,
        title: profile.name,
        subtitle: `Switch profile · ${spaces.find((space) => space.profileId === profile.id)?.name || 'no workspace assigned'}`,
        icon: getIcon('globe', 'w-4 h-4'),
        action: () => {
          let targetSpace = useSpaceStore.getState().spaces.find((space) => space.profileId === profile.id);
          if (!targetSpace) {
            useSpaceStore.getState().addSpace({ name: profile.name, icon: 'globe', color: profile.color, tabIds: [], profileId: profile.id });
            targetSpace = useSpaceStore.getState().spaces.at(-1);
          }
          if (targetSpace) useSpaceStore.getState().setActiveSpace(targetSpace.id);
          onClose();
        },
      })));

    if (lower.startsWith('clear hist')) {
      results.push({
        id: 'cmd-clear-history',
        type: 'command',
        title: 'Clear browsing history',
        subtitle: 'Remove every recorded visit',
        icon: getIcon('history', 'w-4 h-4'),
        action: () => {
          void window.orbApi?.clearHistory();
          onClose();
        },
      });
    }

    const restoreCommand = (): CommandResult | null => {
      const restoreCount = countRestorableTabs();
      if (restoreCount === 0) return null;
      return {
        id: 'cmd-restore-session',
        type: 'command',
        title: `Restore ${restoreCount} ${restoreCount === 1 ? 'tab' : 'tabs'} from last session`,
        subtitle: 'Reopen tabs that are no longer open',
        icon: getIcon('history', 'w-4 h-4'),
        action: () => {
          restoreLastSession();
          onClose();
        },
      };
    };

    if (lower.startsWith('restore')) {
      const entry = restoreCommand();
      if (entry) results.push(entry);
    }

    // 4. Commands
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
            void window.orbApi?.toggleDevTools();
            onClose();
          },
        },
        {
          id: 'cmd-settings',
          type: 'command',
          title: 'Settings',
          subtitle: 'Customize Orb (⌘,)',
          icon: getIcon('search', 'w-4 h-4'),
          action: onOpenSettings,
        }
      );
      const restoreEntry = restoreCommand();
      if (restoreEntry) results.push(restoreEntry);
    } else {
      // URL navigation - treat query as URL/search
      const url = resolveAddressOrSearch(q, searchProvider);
      if (url) results.push({
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-stone-950/20 px-4 pt-[14vh] backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Orb command bar"
        className="orb-command-enter orb-elevated orb-strong orb-shadow relative w-full max-w-xl overflow-hidden rounded-xl border orb-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <div className="relative mb-2 border-b orb-border pb-2">
            <MagnifyingGlass aria-hidden="true" className="orb-muted absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              ref={inputRef}
              aria-label="Search tabs, spaces, or enter a URL"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tabs, spaces, or type a URL..."
              className="orb-strong orb-placeholder w-full bg-transparent py-2 pl-9 pr-9 text-sm outline-none"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="orb-control absolute right-2 top-1/2 -translate-y-1/2 rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto" role="listbox" aria-label="Command results">
            {results.length === 0 ? (
              <div className="orb-muted px-3 py-5 text-center text-sm">No matching tabs or spaces</div>
            ) : (
              results.map((result, index) => (
                <div
                  key={result.id}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onClick={result.action}
                  className={`flex cursor-pointer items-center rounded-md px-3 py-2 transition-colors ${
                    selectedIndex === index ? 'orb-accent-soft' : 'orb-control'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="orb-accent-soft orb-accent flex h-8 w-8 items-center justify-center rounded-md">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="orb-strong truncate text-sm font-medium">
                        {result.title}
                      </div>
                      <div className="orb-muted truncate text-xs">
                        {result.subtitle}
                      </div>
                    </div>
                    <div className="orb-muted ml-auto pl-3">
                      {index === 0 && <SignIn aria-hidden="true" className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="orb-muted flex items-center gap-4 border-t orb-border px-4 py-2 text-[11px]">
          <span><kbd className="orb-strong font-medium">↑ ↓</kbd> Navigate</span>
          <span><kbd className="orb-strong font-medium">↵</kbd> Open</span>
          <span><kbd className="orb-strong font-medium">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
