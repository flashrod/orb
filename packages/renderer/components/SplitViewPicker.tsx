import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { Tab } from '../stores/tabs';

/**
 * Picks the tab that goes beside the active one. Opened from the toolbar or
 * when split view starts without a partner.
 */
export default function SplitViewPicker({
  tabs,
  activeTitle,
  onPick,
  onClose,
}: {
  tabs: Tab[];
  activeTitle: string;
  onPick: (tabId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return tabs;
    return tabs.filter((tab) => `${tab.title} ${tab.url}`.toLowerCase().includes(text));
  }, [query, tabs]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-stone-950/20 px-6 pt-[18vh] backdrop-blur-[2px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-picker-title"
        className="orb-elevated orb-strong w-full max-w-[440px] overflow-hidden rounded-xl border orb-border shadow-[0_24px_60px_rgba(41,37,36,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b orb-border px-3 py-2.5">
          <Columns aria-hidden="true" className="orb-accent h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p id="split-picker-title" className="text-xs font-semibold">Split view</p>
            <p className="orb-muted truncate text-[10px]">Beside {activeTitle || 'this tab'}</p>
          </div>
          <button type="button" aria-label="Close split view picker" onClick={onClose} className="orb-control flex h-6 w-6 items-center justify-center rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b orb-border px-3 py-2">
          <MagnifyingGlass aria-hidden="true" className="orb-muted h-3.5 w-3.5" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search open tabs"
            aria-label="Search open tabs"
            className="orb-strong orb-placeholder min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
        </div>

        <ul className="max-h-[320px] overflow-y-auto p-1.5">
          {matches.length === 0 ? (
            <li className="orb-muted px-2 py-3 text-center text-xs">
              {tabs.length === 0 ? 'Open another tab first.' : 'No tabs match that.'}
            </li>
          ) : matches.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onPick(tab.id)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--orb-hover)]"
              >
                <span className="orb-surface flex h-6 w-6 shrink-0 items-center justify-center rounded border orb-border">
                  {tab.favicon ? <img src={tab.favicon} alt="" className="h-3.5 w-3.5" /> : <Columns aria-hidden="true" className="orb-muted h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="orb-strong block truncate text-xs">{tab.title || tab.url}</span>
                  <span className="orb-muted block truncate text-[10px]">{tab.url}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
