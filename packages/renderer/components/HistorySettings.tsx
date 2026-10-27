import { useEffect, useMemo, useState } from 'react';
import { ClockCounterClockwise, Trash, X } from '@phosphor-icons/react';

type HistoryEntry = {
  url: string;
  title: string;
  host: string;
  visitedAt: number;
  visitCount: number;
};

function formatVisited(visitedAt: number): string {
  const date = new Date(visitedAt);
  const now = Date.now();
  const sameDay = new Date(now).toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
}

export default function HistorySettings({ onOpenGoogleActivity }: { onOpenGoogleActivity?: () => void }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      setEntries(await window.orbApi.queryHistory('', 300));
      setError('');
    } catch {
      setError('Could not read browsing history.');
    }
  };

  useEffect(() => { void refresh(); }, []);

  const visible = useMemo(() => {
    const text = filter.trim().toLowerCase();
    if (!text) return entries;
    return entries.filter((entry) =>
      entry.title.toLowerCase().includes(text) ||
      entry.url.toLowerCase().includes(text) ||
      entry.host.toLowerCase().includes(text));
  }, [entries, filter]);

  const remove = async (url: string) => {
    setBusy(true);
    setNotice('');
    try {
      await window.orbApi.removeHistory(url);
      await refresh();
      setNotice('Visit removed.');
    } catch {
      setError('Could not remove that visit.');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setNotice('');
    try {
      await window.orbApi.clearHistory();
      await refresh();
      setNotice('Browsing history cleared.');
    } catch {
      setError('Could not clear history.');
    } finally {
      setBusy(false);
    }
  };

  const clearToday = async () => {
    setBusy(true);
    setNotice('');
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const result = await window.orbApi.clearHistoryRange(start.getTime(), Date.now());
      await refresh();
      setNotice(`Cleared ${result.removed} ${result.removed === 1 ? 'visit' : 'visits'} from today.`);
    } catch {
      setError('Could not clear today.');
    } finally {
      setBusy(false);
    }
  };

  const forgetSite = async (host: string) => {
    setBusy(true);
    setNotice('');
    try {
      const result = await window.orbApi.removeHistoryHost(host);
      await refresh();
      setNotice(`Removed ${result.removed} ${result.removed === 1 ? 'visit' : 'visits'} from ${host}.`);
    } catch {
      setError('Could not remove that site.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="mx-auto max-w-[720px] space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="orb-strong text-sm font-semibold">History</h2>
        <p className="orb-muted mt-1 text-xs">Visits are stored locally. Repeated visits update one row instead of adding duplicates. Press <kbd className="orb-key orb-strong">⌘Y</kbd> anywhere to open full history.</p>
      </div>
      {entries.length > 0 && <div className="flex shrink-0 items-center gap-2">
        <button type="button" disabled={busy} onClick={() => void clearToday()} className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs disabled:opacity-50">
          Clear today
        </button>
        <button type="button" disabled={busy} onClick={() => void clear()} className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs disabled:opacity-50">
          <Trash className="h-3.5 w-3.5" />Clear history
        </button>
      </div>}
    </div>

    <div className="orb-elevated flex flex-wrap items-center gap-2 rounded-lg border orb-border px-3 py-2">
      <p className="orb-muted min-w-0 flex-1 text-[11px] leading-5">
        Orb can only delete the history stored on this Mac. Google keeps account activity on its own servers.
      </p>
      {onOpenGoogleActivity && (
        <button type="button" onClick={onOpenGoogleActivity} className="orb-control shrink-0 rounded-md border orb-border px-2.5 py-1 text-[11px]">
          Open Google My Activity ↗
        </button>
      )}
    </div>

    <div className="relative">
      <ClockCounterClockwise aria-hidden="true" className="orb-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <input
        type="search"
        aria-label="Filter history"
        placeholder="Filter by title, host, or URL"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        className="orb-control h-9 w-full rounded-md border orb-border bg-transparent pl-9 pr-3 text-xs outline-none"
      />
    </div>

    {error && <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-xs text-red-800">{error}</p>}

    {visible.length === 0
      ? <div className="orb-elevated orb-muted rounded-lg border orb-border px-4 py-6 text-center text-xs">
        {entries.length === 0 ? 'No browsing history yet.' : 'No visits match that filter.'}
      </div>
      : <div className="space-y-1">{visible.map((entry) => <div key={entry.url} className="orb-elevated flex items-center gap-3 rounded-md border orb-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="orb-strong truncate text-xs">{entry.title || entry.host}</p>
          <p className="orb-muted truncate text-[10px]">
            {entry.host} · {formatVisited(entry.visitedAt)}{entry.visitCount > 1 ? ` · ${entry.visitCount} visits` : ''}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Forget all visits to ${entry.host}`}
          title={`Forget everything from ${entry.host}`}
          disabled={busy}
          onClick={() => void forgetSite(entry.host)}
          className="orb-control shrink-0 rounded px-2 py-1 text-[10px] disabled:opacity-40"
        >
          Forget site
        </button>
        <button
          type="button"
          aria-label={`Remove visit to ${entry.host}`}
          disabled={busy}
          onClick={() => void remove(entry.url)}
          className="orb-control shrink-0 rounded p-1.5 disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>)}</div>}

    {notice && <p role="status" className="orb-accent-soft orb-strong rounded-md px-3 py-2 text-xs">{notice}</p>}
  </div>;
}
