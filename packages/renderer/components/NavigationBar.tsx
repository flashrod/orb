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
    <nav aria-label="Page navigation" className="flex h-10 items-center gap-1 px-3">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="orb-control flex h-8 w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-35"
        title="Back"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className="orb-control flex h-8 w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-35"
        title="Forward"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
      <button
        onClick={onReload}
        className="orb-control flex h-8 w-8 items-center justify-center rounded-md"
        title="Reload"
      >
        <ArrowClockwise className="w-4 h-4" />
      </button>
      <button
        onClick={onPickElement}
        disabled={!canPickElement}
        className="orb-control flex h-8 w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-35"
        title="Pick an element for a Boost"
        aria-label="Pick an element for a Boost"
      >
        <CursorClick className="w-4 h-4" />
      </button>
      <button
        onClick={onToggleVerticalTabs}
        className="orb-control flex h-8 w-8 items-center justify-center rounded-md"
        title="Vertical Tabs"
      >
        <List className="w-4 h-4" />
      </button>
    </nav>
  );
}
