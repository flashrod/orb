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
    <div className="flex items-center gap-1 px-3 h-10">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 transition-colors"
        title="Back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 transition-colors"
        title="Forward"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
      <button
        onClick={onReload}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-colors"
        title="Reload"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <button
        onClick={onToggleVerticalTabs}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-colors"
        title="Vertical Tabs"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
