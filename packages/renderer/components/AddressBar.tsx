import React from 'react';
import { Search } from 'lucide-react';


export default function AddressBar({
  activeTab,
  onNavigate,
}: {
  activeTab: { url: string; title: string } | undefined;
  onNavigate?: (url: string) => void;
}) {
  const [url, setUrl] = React.useState(activeTab?.url || '');
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    setUrl(activeTab?.url || '');
  }, [activeTab?.url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = url.trim();
    if (!input) return;

    const looksLikeAddress = /^(localhost|[\w-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(input);
    const finalUrl = input.includes('://')
      ? input
      : looksLikeAddress
        ? `https://${input}`
        : `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    onNavigate?.(finalUrl);
    setFocused(false);
  };

  return (
    <div className="flex h-10 items-center border-b border-stone-200 bg-stone-100/80 px-3">
      <div className="relative flex-1">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
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
            className="w-full rounded-md border border-transparent bg-transparent py-1.5 pl-9 pr-4 text-[13px] text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-300 focus:bg-white focus:shadow-sm"
            autoComplete="off"
          />
        </form>
        {focused && (
          <div className="absolute left-0 right-0 top-full mt-1 rounded-md border border-stone-200 bg-white py-2 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-stone-500">
              <Search aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Search the web or enter a website</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
