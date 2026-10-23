import React, { useEffect, useRef, useState } from 'react';
import { Search, X, ArrowUp, ArrowDown, Enter } from 'lucide-react';

interface CommandResult {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
  host?: string;
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

  const mockResults: CommandResult[] = [
    {
      id: 'new-tab',
      title: 'New Tab',
      subtitle: 'Open a new tab in the current space',
      icon: <Search className="w-4 h-4" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('orb:new-tab'));
        onClose();
      },
    },
    {
      id: 'new-space',
      title: 'New Space',
      subtitle: 'Create a new browsing space',
      icon: <Search className="w-4 h-4" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('orb:new-space'));
        onClose();
      },
    },
    {
      id: 'devtools',
      title: 'Developer Tools',
      subtitle: 'Open Chrome DevTools',
      icon: <Search className="w-4 h-4" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('orb:toggle-devtools'));
        onClose();
      },
    },
  ];

  useEffect(() => {
    inputRef.current?.focus();

    const filtered = mockResults.filter((r) =>
      r.title.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
    setSelectedIndex(-1);
  }, [query]);

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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />
      <div
        className="w-full max-w-md bg-orb-panel border border-white/10 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tabs, spaces, commands..."
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

          <div className="max-h-60 overflow-y-auto">
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
                      {index === 0 && <Enter className="w-3 h-3" />}
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
