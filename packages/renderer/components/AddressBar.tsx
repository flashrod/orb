import React from 'react';
import { createPortal } from 'react-dom';
import { Globe, MagnifyingGlass } from '@phosphor-icons/react';
import { resolveAddressOrSearch } from '../lib/navigation';
import { useBrowserPreferencesStore } from '../stores/preferences';
import { useShellOverlay } from '../stores/shellOverlay';

type Suggestion = { url: string; title: string; host: string; visitCount: number };

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
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
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

  // Empty field = the places this person actually lives in. Typing narrows the
  // same history, weighted by how often each page is opened.
  React.useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    const text = hasTyped ? url.trim() : '';

    const load = async () => {
      const api = window.orbApi;
      if (!api) return;
      try {
        const entries = text ? await api.queryHistory(text, 6) : await api.topSites(6);
        if (cancelled) return;
        setSuggestions(entries);
        setActiveIndex(-1);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    };

    const timer = window.setTimeout(() => void load(), text ? 90 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [focused, url, hasTyped]);

  const openSuggestion = (suggestion: Suggestion) => {
    onNavigate?.(suggestion.url);
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
    const destination = selected ? selected.url : resolveAddressOrSearch(url, searchProvider);
    if (!destination) return;
    onNavigate?.(destination);
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (e.key === 'Escape') {
      setFocused(false);
      e.currentTarget.blur();
    }
  };

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
            {suggestions.length > 0 ? (
              <ul role="listbox" aria-label={hasTyped ? 'History matches' : 'Frequent sites'}>
                {!hasTyped && (
                  <li aria-hidden="true" className="orb-muted px-3 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-[0.12em]">
                    Frequent sites
                  </li>
                )}
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.url} role="option" aria-selected={index === activeIndex}>
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openSuggestion(suggestion)}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left ${index === activeIndex ? 'bg-[var(--orb-hover)]' : ''}`}
                    >
                      <Globe aria-hidden="true" className="orb-muted h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="orb-strong block truncate text-[12px]">{suggestion.title || suggestion.host}</span>
                        <span className="orb-muted block truncate text-[10px]">{suggestion.host}</span>
                      </span>
                    </button>
                  </li>
                ))}
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
