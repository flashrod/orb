import React from 'react';
import { ArrowLeft, ArrowRight, ArrowClockwise, CursorClick, List } from '@phosphor-icons/react';

export default function NavigationBar({
  onBack,
  onForward,
  onReload,
  onToggleVerticalTabs,
  onPickElement,
  canPickElement,
  canGoBack,
  canGoForward,
}: {
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onToggleVerticalTabs: () => void;
  onPickElement: () => void;
  canPickElement: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
}) {
  return (
    <nav
      aria-label="Page navigation"
      className="flex h-12 items-center gap-1 px-2.5 rounded-2xl orb-surface border orb-border shadow-sm"
    >
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="orb-nav-btn flex h-9 w-9 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-35"
        title="Back"
        aria-label="Back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className="orb-nav-btn flex h-9 w-9 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-35"
        title="Forward"
        aria-label="Forward"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
      <button
        onClick={onReload}
        className="orb-nav-btn flex h-9 w-9 items-center justify-center rounded-full"
        title="Reload"
        aria-label="Reload"
      >
        <ArrowClockwise className="w-4 h-4" />
      </button>
      <button
        onClick={onPickElement}
        disabled={!canPickElement}
        className="orb-nav-btn flex h-9 w-9 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-35"
        title="Pick an element for a Boost"
        aria-label="Pick an element for a Boost"
      >
        <CursorClick className="w-4 h-4" />
      </button>
      <button
        onClick={onToggleVerticalTabs}
        className="orb-nav-btn flex h-9 w-9 items-center justify-center rounded-full"
        title="Vertical Tabs"
        aria-label="Vertical Tabs"
      >
        <List className="w-4 h-4" />
      </button>
    </nav>
  );
}
