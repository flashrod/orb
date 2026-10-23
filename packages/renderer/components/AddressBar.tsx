import React from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';


export default function AddressBar({
  activeTab,
  onNavigate,
}: {
  activeTab: { url: string; title: string } | undefined;
  onNavigate?: (url: string) => void;
}) {
  const [url, setUrl] = React.useState(activeTab?.url === 'about:blank' ? '' : activeTab?.url || '');
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    setUrl(activeTab?.url === 'about:blank' ? '' : activeTab?.url || '');
  }, [activeTab?.url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = url.trim();
    if (!input) return;

    const looksLikeAddress = /^(localhost(:\d+)?|([\w-]+\.)+[a-z]{2,}(:\d+)?)([/?#].*)?$/i.test(input);
    const finalUrl = input.includes('://')
      ? input
      : looksLikeAddress
        ? `https://${input}`
        : `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    onNavigate?.(finalUrl);
    setFocused(false);
  };

  return (
    <div className="orb-address orb-surface flex shrink-0 items-center border-b orb-border px-3">
      <div className="relative flex-1">
        <MagnifyingGlass aria-hidden="true" className="orb-muted absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
        <form
          onSubmit={handleSubmit}
          className="w-full"
        >
          <input
            aria-label="Search or enter address"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search or type address"
            className="orb-strong orb-placeholder w-full rounded-md border border-transparent bg-transparent py-1.5 pl-9 pr-4 text-[13px] outline-none transition-colors focus:border-[var(--orb-border-strong)] focus:bg-[var(--orb-elevated)] focus:shadow-sm"
            autoComplete="off"
          />
        </form>
        {focused && (
          <div className="orb-elevated orb-shadow orb-strong absolute left-0 right-0 top-full mt-1 rounded-lg border orb-border py-2">
            <div className="orb-muted flex items-center gap-2 px-3 py-1.5 text-xs">
              <MagnifyingGlass aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Search the web or enter a website</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
