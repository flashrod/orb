import React from 'react';
import { createPortal } from 'react-dom';
import { Globe, MagnifyingGlass, X } from '@phosphor-icons/react';
import { resolveAddressOrSearch } from '../lib/navigation';
import { useBrowserPreferencesStore } from '../stores/preferences';
import { useShellOverlay } from '../stores/shellOverlay';

type Suggestion = { url: string; title: string; host: string; visitCount: number };

function SuggestionRow({
  suggestion,
  active,
  onHover,
  onOpen,
  onRemove,
}: {
  suggestion: Suggestion;
  active: boolean;
  onHover: () => void;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  return (
    <li role="option" aria-selected={active} className="group relative">
      <button
        type="button"
        tabIndex={-1}
        onMouseEnter={onHover}
        onClick={onOpen}
        className={`flex w-full items-center gap-2.5 py-1.5 pl-3 pr-8 text-left ${active ? 'bg-[var(--orb-hover)]' : ''}`}
      >
        <Globe aria-hidden="true" className="orb-muted h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="orb-strong block truncate text-[12px]">{suggestion.title || suggestion.host}</span>
          <span className="orb-muted block truncate text-[10px]">{suggestion.host}</span>
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Remove ${suggestion.host} from suggestions`}
          title="Remove from suggestions"
          onClick={(event) => { event.stopPropagation(); onRemove(); }}
          className="orb-muted absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded opacity-0 transition-opacity hover:bg-[var(--orb-surface)] group-hover:opacity-100 focus:opacity-100"
        >
          <X aria-hidden="true" className="h-3 w-3" />
        </button>
      )}
    </li>
  );
}

export default function AddressBar({
  activeTab,
  onNavigate,
}: {
  activeTab: { id: string; url: string; title: string } | undefined;
  onNavigate?: (url: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [url, setUrl] = React.useState(activeTab?.url === 'about:blank' ? '' : activeTab?.url || '');
  const [focused, setFocused] = React.useState(false);
  const [hasTyped, setHasTyped] = React.useState(false);
  const [matches, setMatches] = React.useState<Suggestion[]>([]);
  const [frequent, setFrequent] = React.useState<Suggestion[]>([]);
  const [recent, setRecent] = React.useState<Suggestion[]>([]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [suggestionAnchor, setSuggestionAnchor] = React.useState<{ left: number; top: number; width: number } | null>(null);
  const searchProvider = useBrowserPreferencesStore((state) => state.searchProvider);
  useShellOverlay(focused && Boolean(suggestionAnchor));

  const updateSuggestionAnchor = React.useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setSuggestionAnchor({ left: rect.left, top: rect.bottom + 6, width: rect.width });
  }, []);

  React.useEffect(() => {
    setUrl(activeTab?.url === 'about:blank' ? '' : activeTab?.url || '');
    setHasTyped(false);
    if (activeTab?.url === 'about:blank') {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [activeTab?.id, activeTab?.url]);

  React.useEffect(() => {
    if (!focused) return;
    updateSuggestionAnchor();
    window.addEventListener('resize', updateSuggestionAnchor);
    window.addEventListener('scroll', updateSuggestionAnchor, true);
    return () => {
      window.removeEventListener('resize', updateSuggestionAnchor);
      window.removeEventListener('scroll', updateSuggestionAnchor, true);
    };
  }, [focused, updateSuggestionAnchor]);

  // Empty field = where this person actually lives. Typing narrows the same
  // history, weighted by how often each page is opened.
  React.useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    const text = hasTyped ? url.trim() : '';

    const load = async () => {
      const api = window.orbApi;
      if (!api) return;
      try {
        if (text) {
          const entries = await api.queryHistory(text, 6);
          if (cancelled) return;
          setMatches(entries);
          setFrequent([]);
          setRecent([]);
        } else {
          const [top, latest] = await Promise.all([api.topSites(5), api.recentSites(5)]);
          if (cancelled) return;
          const topUrls = new Set(top.map((entry) => entry.url));
          setMatches([]);
          setFrequent(top);
          setRecent(latest.filter((entry) => !topUrls.has(entry.url)));
        }
        setActiveIndex(-1);
      } catch {
        if (!cancelled) {
          setMatches([]);
          setFrequent([]);
          setRecent([]);
        }
      }
    };

    const timer = window.setTimeout(() => void load(), text ? 90 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [focused, url, hasTyped, refreshKey]);

  const flat = hasTyped ? matches : [...frequent, ...recent];

  const openSuggestion = (suggestion: Suggestion) => {
    onNavigate?.(suggestion.url);
    setFocused(false);
    inputRef.current?.blur();
  };

  const removeSuggestion = async (suggestion: Suggestion) => {
    await window.orbApi?.removeHistory(suggestion.url);
    setRefreshKey((key) => key + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = activeIndex >= 0 ? flat[activeIndex] : undefined;
    const destination = selected ? selected.url : resolveAddressOrSearch(url, searchProvider);
    if (!destination) return;
    onNavigate?.(destination);
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (e.key === 'Escape') {
      setFocused(false);
      e.currentTarget.blur();
    }
  };

  const renderGroup = (label: string, items: Suggestion[], offset: number) =>
    items.length > 0 && (
      <React.Fragment key={label}>
        <li aria-hidden="true" className="orb-muted px-3 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.12em]">
          {label}
        </li>
        {items.map((suggestion, index) => (
          <SuggestionRow
            key={suggestion.url}
            suggestion={suggestion}
            active={offset + index === activeIndex}
            onHover={() => setActiveIndex(offset + index)}
            onOpen={() => openSuggestion(suggestion)}
            onRemove={() => void removeSuggestion(suggestion)}
          />
        ))}
      </React.Fragment>
    );

  return (
    <div className="orb-address orb-surface flex min-w-0 flex-1 items-center gap-1 px-2.5 rounded-3xl border orb-border shadow-sm">
      <div className="relative flex-1">
        <MagnifyingGlass aria-hidden="true" className="orb-muted absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
        <form
          onSubmit={handleSubmit}
          className="w-full"
        >
          <input
            ref={inputRef}
            aria-label="Search or enter address"
            aria-autocomplete="list"
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setHasTyped(true); }}
            onFocus={(event) => {
              setFocused(true);
              setHasTyped(false);
              updateSuggestionAnchor();
              if (activeTab?.url !== 'about:blank') event.currentTarget.select();
            }}
            onBlur={() => { setFocused(false); setHasTyped(false); }}
            onKeyDown={handleKeyDown}
            placeholder="Search or type address"
            className="orb-strong orb-placeholder w-full rounded-full border-transparent bg-transparent py-1.5 pl-9 pr-4 text-[13px] outline-none transition-colors focus:border-[var(--orb-border-strong)] focus:bg-[var(--orb-elevated)] focus:shadow-sm"
            autoComplete="off"
          />
        </form>
        {focused && suggestionAnchor && createPortal(
          <div
            style={{ left: suggestionAnchor.left, top: suggestionAnchor.top, width: suggestionAnchor.width, backgroundColor: 'var(--orb-elevated)' }}
            className="orb-strong fixed z-[10000] rounded-2xl border orb-border py-2 shadow-[0_20px_40px_rgba(41,37,36,0.16)]"
            onMouseDown={(event) => event.preventDefault()}
          >
            {flat.length > 0 ? (
              <ul role="listbox" aria-label={hasTyped ? 'History matches' : 'Suggested sites'}>
                {hasTyped
                  ? renderGroup('Matches', matches, 0)
                  : (
                    <React.Fragment>
                      {renderGroup('Frequent', frequent, 0)}
                      {renderGroup('Recent', recent, frequent.length)}
                    </React.Fragment>
                  )}
              </ul>
            ) : (
              <div className="orb-muted flex items-center gap-2 px-3 py-1.5 text-xs">
                <MagnifyingGlass aria-hidden="true" className="h-3.5 w-3.5" />
                <span>Search the web or enter a website</span>
              </div>
            )}
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}
