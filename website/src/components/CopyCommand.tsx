'use client';

import { useEffect, useState } from 'react';

/**
 * A command a tester has to paste. Copying by hand from a web page is exactly
 * where people mistype a path, so give them the button.
 */
export default function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // Clipboard permissions can be refused; the text is selectable anyway.
    }
  };

  return (
    <div className="mt-4 flex items-stretch gap-2">
      <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-elevated px-4 py-3 font-mono text-xs text-ink">
        {command}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink transition-colors duration-700 ease-fluid hover:border-accent hover:text-accent-strong"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
