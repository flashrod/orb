import React from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { resolveAddressOrSearch } from '../lib/navigation';


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
  const [suggestionAnchor, setSuggestionAnchor] = React.useState<{ left: number; top: number; width: number } | null>(null);

  const updateSuggestionAnchor = React.useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) setSuggestionAnchor({ left: rect.left, top: rect.bottom + 6, width: rect.width });
  }, []);

  React.useEffect(() => {
    setUrl(activeTab?.url === 'about:blank' ? '' : activeTab?.url || '');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const destination = resolveAddressOrSearch(url);
    if (!destination) return;
    onNavigate?.(destination);
    setFocused(false);
  };

  return (
    <div className="orb-address orb-surface flex min-w-0 flex-1 items-center px-2">
      <div className="relative flex-1">
        <MagnifyingGlass aria-hidden="true" className="orb-muted absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
        <form
          onSubmit={handleSubmit}
          className="w-full"
        >
          <input
            ref={inputRef}
            aria-label="Search or enter address"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={(event) => { setFocused(true); updateSuggestionAnchor(); if (activeTab?.url !== 'about:blank') event.currentTarget.select(); }}
            onBlur={() => setFocused(false)}
            placeholder="Search or type address"
            className="orb-strong orb-placeholder w-full rounded-md border border-transparent bg-transparent py-1.5 pl-9 pr-4 text-[13px] outline-none transition-colors focus:border-[var(--orb-border-strong)] focus:bg-[var(--orb-elevated)] focus:shadow-sm"
            autoComplete="off"
          />
        </form>
        {focused && suggestionAnchor && createPortal(
          <div style={{ left: suggestionAnchor.left, top: suggestionAnchor.top, width: suggestionAnchor.width, backgroundColor: 'var(--orb-elevated)' }} className="orb-strong fixed z-[10000] rounded-lg border orb-border py-2 shadow-[0_12px_32px_rgba(41,37,36,0.18)]">
            <div className="orb-muted flex items-center gap-2 px-3 py-1.5 text-xs">
              <MagnifyingGlass aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Search the web or enter a website</span>
            </div>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}
