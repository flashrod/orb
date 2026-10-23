import React from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, List } from 'lucide-react';

export default function NavigationBar({
  onBack,
  onForward,
  onReload,
  onToggleVerticalTabs,
  canGoBack,
  canGoForward,
}: {
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onToggleVerticalTabs: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}) {
  return (
    <nav aria-label="Page navigation" className="flex h-10 items-center gap-1 px-3 text-stone-600">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-stone-200/70 hover:text-stone-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
        title="Back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-stone-200/70 hover:text-stone-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
        title="Forward"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
      <button
        onClick={onReload}
        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-stone-200/70 hover:text-stone-900 active:scale-[0.98]"
        title="Reload"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <button
        onClick={onToggleVerticalTabs}
        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-stone-200/70 hover:text-stone-900 active:scale-[0.98]"
        title="Vertical Tabs"
      >
        <List className="w-4 h-4" />
      </button>
    </nav>
  );
}
