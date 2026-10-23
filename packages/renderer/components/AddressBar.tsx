import React from 'react';
import { Search, Link } from 'lucide-react';

export default function AddressBar({
  activeTab,
}: {
  activeTab: { url: string; title: string } | undefined;
}) {
  const [url, setUrl] = React.useState(activeTab?.url || '');
  const [focused, setFocused] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = url.trim();
    if (!input) return;

    const finalUrl = input.includes('://') ? input : `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    // In a real implementation, this would update the active tab's URL via IPC
    console.log('Navigate to:', finalUrl);
  };

  return (
    <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <form
          onSubmit={handleSubmit}
          className="w-full"
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search or type address"
            className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none pl-10 pr-4"
            autoComplete="off"
          />
        </form>
        {focused && (
          <div className="absolute top-full left-0 right-0 bg-white/10 border border-white/10 rounded-b-lg mt-1 py-2 shadow-lg">
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 cursor-pointer">
              <Link className="w-4 h-4 text-white/60" />
              <span>Search with default engine</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
