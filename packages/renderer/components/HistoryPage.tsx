import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClockCounterClockwise, Globe, MagnifyingGlass, Prohibit, X } from '@phosphor-icons/react';

export type HistoryPageEntry = {
  url: string;
  title: string;
  host: string;
  visitedAt: number;
  visitCount: number;
};

const DAY_MS = 86_400_000;

function startOfDay(value: number): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function dayLabel(visitedAt: number, now = Date.now()): string {
  const today = startOfDay(now);
  const day = startOfDay(visitedAt);
  if (day === today) return 'Today';
  if (day === today - DAY_MS) return 'Yesterday';
  const date = new Date(visitedAt);
  const withinWeek = today - day < 7 * DAY_MS;
  return date.toLocaleDateString(undefined, withinWeek
    ? { weekday: 'long' }
    : { weekday: 'short', month: 'short', day: 'numeric', year: date.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
}

function timeLabel(visitedAt: number): string {
  return new Date(visitedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Full-page history (⌘Y), not a dialog: search, day grouping, remove one
 * visit, forget a whole site, clear today, or clear everything. Local only.
 */
export default function HistoryPage({
  onNavigate,
  onClose,
}: {
  onNavigate: (url: string) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<HistoryPageEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = async () => {
    try {
      const next = await window.orbApi?.queryHistory('', 1000);
      setEntries(next ?? []);
    } catch {
      setEntries([]);
      setNotice('Could not read browsing history.');
    }
  };

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const visible = useMemo(() => {
    const text = filter.trim().toLowerCase();
    const filtered = text
      ? entries.filter((entry) => `${entry.title} ${entry.url} ${entry.host}`.toLowerCase().includes(text))
      : entries;
    return [...filtered].sort((a, b) => b.visitedAt - a.visitedAt);
  }, [entries, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, HistoryPageEntry[]>();
    for (const entry of visible) {
      const label = dayLabel(entry.visitedAt);
      const list = map.get(label);
      if (list) list.push(entry);
      else map.set(label, [entry]);
    }
    return [...map.entries()];
  }, [visible]);

  const removeVisit = async (url: string) => {
    setBusy(true);
    try {
      await window.orbApi?.removeHistory(url);
      setEntries((current) => current.filter((entry) => entry.url !== url));
      setNotice('Visit removed.');
    } finally {
      setBusy(false);
    }
  };

  const forgetSite = async (host: string) => {
    setBusy(true);
    try {
      const result = await window.orbApi?.removeHistoryHost(host);
      setEntries((current) => current.filter((entry) => entry.host !== host));
      setNotice(`Removed ${result?.removed ?? 0} ${result?.removed === 1 ? 'visit' : 'visits'} from ${host}.`);
    } finally {
      setBusy(false);
    }
  };

  const clearToday = async () => {
    setBusy(true);
    try {
      const from = startOfDay(Date.now());
      const result = await window.orbApi?.clearHistoryRange(from, Date.now());
      await refresh();
      setNotice(`Cleared ${result?.removed ?? 0} ${result?.removed === 1 ? 'visit' : 'visits'} from today.`);
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setBusy(true);
    try {
      await window.orbApi?.clearHistory();
      setEntries([]);
      setConfirmClear(false);
      setNotice('Browsing history cleared.');
    } finally {
      setBusy(false);
    }
  };

  const open = (url: string) => {
    onNavigate(url);
    onClose();
  };

  return (
    <div className="orb-frame orb-page-enter absolute inset-0 z-20 flex flex-col overflow-hidden">
      <header className="orb-sidebar flex shrink-0 flex-wrap items-center gap-2 border-b orb-border px-4 py-2.5 sm:px-6">
        <button type="button" onClick={onClose} aria-label="Back to page" title="Back · Esc" className="orb-control flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <ClockCounterClockwise aria-hidden="true" className="orb-accent h-4 w-4 shrink-0" />
          <h1 className="orb-strong text-sm font-semibold">History</h1>
          <span className="orb-muted hidden text-[11px] sm:inline">{entries.length} {entries.length === 1 ? 'page' : 'pages'}</span>
        </div>
        <div className="relative order-last w-full min-w-0 sm:order-none sm:ml-auto sm:w-auto sm:flex-1 sm:max-w-[360px]">
          <MagnifyingGlass aria-hidden="true" className="orb-muted absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            autoFocus
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search history"
            aria-label="Search history"
            className="orb-control h-8 w-full rounded-md border orb-border bg-transparent pl-8 pr-7 text-xs outline-none"
          />
          {filter && <button type="button" onClick={() => setFilter('')} aria-label="Clear history search" className="orb-control absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded"><X className="h-3 w-3" /></button>}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
          <button type="button" onClick={() => void clearToday()} disabled={busy || entries.length === 0} className="orb-control rounded-md px-2 py-1 text-[11px] disabled:opacity-40">Clear today</button>
          <button
            type="button"
            onClick={() => void clearAll()}
            disabled={busy || entries.length === 0}
            onBlur={() => setConfirmClear(false)}
            className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${confirmClear ? 'bg-red-600 text-white' : 'orb-control'}`}
          >
            {confirmClear ? 'Click again to clear all' : 'Clear all'}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-5 sm:px-8">
          {groups.length === 0 ? (
            <div className="orb-elevated orb-muted mt-16 rounded-xl border border-dashed orb-border px-6 py-12 text-center text-xs">
              {entries.length === 0 ? 'No browsing history yet. Pages you visit will appear here.' : 'No visits match that search.'}
            </div>
          ) : groups.map(([label, dayEntries]) => (
            <section key={label} aria-label={label} className="mb-6">
              <h2 className="orb-muted mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</h2>
              <ul className="orb-elevated overflow-hidden rounded-xl border orb-border">
                {dayEntries.map((entry) => (
                  <li key={entry.url} className="group flex items-center gap-2 border-b orb-border px-3 py-2 last:border-b-0 hover:bg-[var(--orb-hover)]">
                    <button type="button" onClick={() => open(entry.url)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="orb-surface flex h-7 w-7 shrink-0 items-center justify-center rounded-md border orb-border"><Globe aria-hidden="true" className="orb-muted h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="orb-strong block truncate text-xs">{entry.title || entry.host}</span>
                        <span className="orb-muted block truncate text-[10px]">
                          {entry.host} · {timeLabel(entry.visitedAt)}{entry.visitCount > 1 ? ` · ${entry.visitCount} visits` : ''}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Forget all visits to ${entry.host}`}
                      title={`Forget everything from ${entry.host}`}
                      disabled={busy}
                      onClick={() => void forgetSite(entry.host)}
                      className="orb-control flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 disabled:opacity-40"
                    >
                      <Prohibit className="h-3 w-3" />Forget site
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove visit to ${entry.host}`}
                      title="Remove this visit"
                      disabled={busy}
                      onClick={() => void removeVisit(entry.url)}
                      className="orb-control flex h-6 w-6 shrink-0 items-center justify-center rounded disabled:opacity-40"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <footer className="orb-sidebar flex shrink-0 items-center justify-between gap-3 border-t orb-border px-4 py-2 text-[10px] sm:px-6">
        <p role="status" className="orb-muted min-w-0 flex-1 truncate">{notice || 'History stays on this Mac. Nothing is synced.'}</p>
        <span className="orb-muted shrink-0"><kbd className="orb-key orb-strong">⌘Y</kbd> to close</span>
      </footer>
    </div>
  );
}
