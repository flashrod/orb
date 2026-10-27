import { useEffect, useState } from 'react';
import { Gauge, Snowflake } from '@phosphor-icons/react';
import { useTabStore } from '../stores/tabs';
import { useBrowserPreferencesStore } from '../stores/preferences';
import { nativeTabsEnabled } from '../lib/nativeTabs';
import { formatBytes, sortByMemory, totalTabBytes, type TabMemorySample } from '../../shared/memory';

export default function PerformanceSettings() {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const neverHibernate = useBrowserPreferencesStore((state) => state.neverHibernate);
  const addNeverHibernate = useBrowserPreferencesStore((state) => state.addNeverHibernate);
  const removeNeverHibernate = useBrowserPreferencesStore((state) => state.removeNeverHibernate);
  const [draft, setDraft] = useState('');
  const [samples, setSamples] = useState<TabMemorySample[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const enabled = nativeTabsEnabled() && Boolean(window.orbApi?.tabs?.memory);

  const refresh = async () => {
    if (!enabled) return;
    try {
      setSamples(await window.orbApi.tabs.memory());
      setError('');
    } catch {
      setError('Could not read tab memory.');
    }
  };

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [enabled]);

  const hibernate = async (id?: string) => {
    setBusy(true);
    setNotice('');
    try {
      const ids = id ? [id] : await window.orbApi.tabs.hibernateBackground();
      if (id) await window.orbApi.tabs.hibernate(id);
      await refresh();
      setNotice(ids.length === 0 ? 'No background tabs to hibernate.' : `${ids.length} tab${ids.length === 1 ? '' : 's'} hibernated.`);
    } catch {
      setError('Could not hibernate tabs.');
    } finally {
      setBusy(false);
    }
  };

  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  const rows = sortByMemory(samples).map((sample) => ({ ...sample, tab: byId.get(sample.id) }));
  const total = totalTabBytes(samples);

  return <div className="mx-auto max-w-[720px] space-y-6">
    <div>
      <h2 className="orb-strong text-sm font-semibold">Memory</h2>
      <p className="orb-muted mt-1 text-xs">Each page runs in its own renderer. Values are the renderer working set reported by Chromium and may count some shared memory more than once.</p>
    </div>

    {!enabled
      ? <div className="orb-elevated orb-muted rounded-lg border orb-border px-4 py-5 text-xs">The per-tab memory view needs the native tab engine. Orb runs it by default; relaunch without <code>ORB_NATIVE_TABS=0</code> to enable it.</div>
      : <>
        <div className="orb-elevated flex items-center justify-between gap-4 rounded-lg border orb-border p-4">
          <div className="flex items-center gap-3">
            <div className="orb-accent-soft orb-accent flex h-9 w-9 items-center justify-center rounded-md"><Gauge className="h-4 w-4" /></div>
            <div>
              <p className="orb-strong text-sm font-semibold">{formatBytes(total)}</p>
              <p className="orb-muted text-[11px]">{rows.length} live tab{rows.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <button type="button" disabled={busy || rows.length === 0} onClick={() => void hibernate()} className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs disabled:opacity-50">
            <Snowflake className="h-3.5 w-3.5" />Hibernate background tabs
          </button>
        </div>

        {rows.length === 0
          ? <div className="orb-elevated orb-muted rounded-lg border orb-border px-4 py-5 text-xs">No live native tabs yet.</div>
          : <div className="space-y-1.5">{rows.map((row) => <div key={row.id} className="orb-elevated flex items-center gap-3 rounded-md border orb-border px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="orb-strong block truncate text-xs">{row.tab?.title || 'Untitled tab'}</span>
              <span className="orb-muted block truncate text-[10px]">{row.tab?.url || row.id}{row.pid ? ` · pid ${row.pid}` : ''}</span>
            </span>
            <span className="orb-muted shrink-0 text-[11px] tabular-nums">{formatBytes(row.bytes)}</span>
            <button type="button" disabled={busy || row.id === activeTabId} onClick={() => void hibernate(row.id)} className="orb-control rounded px-2 py-1 text-[10px] disabled:opacity-40">Hibernate</button>
          </div>)}</div>}
      </>}

    <div className="space-y-2">
      <div>
        <h2 className="orb-strong text-sm font-semibold">Never hibernate</h2>
        <p className="orb-muted mt-1 text-xs">
          Tabs protect themselves while they play audio, sit in a call, hold typed input or have notifications allowed.
          Add a site here to keep it loaded no matter what.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const added = addNeverHibernate(draft);
          if (added) {
            setDraft('');
            setError('');
          } else {
            setError('Enter a site like example.com.');
          }
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="example.com"
          aria-label="Site to never hibernate"
          className="orb-control min-w-0 flex-1 rounded-md border orb-border bg-transparent px-3 py-2 text-xs"
        />
        <button type="submit" disabled={!draft.trim()} className="orb-control rounded-md border orb-border px-3 py-2 text-xs disabled:opacity-50">
          Add
        </button>
      </form>

      {neverHibernate.length === 0
        ? <div className="orb-elevated orb-muted rounded-lg border orb-border px-4 py-4 text-xs">No sites are pinned open. Orb hibernates idle background tabs after ten minutes.</div>
        : <ul className="space-y-1.5">{neverHibernate.map((domain) => <li key={domain} className="orb-elevated flex items-center gap-3 rounded-md border orb-border px-3 py-2">
          <span className="orb-strong min-w-0 flex-1 truncate text-xs">{domain}</span>
          <button type="button" onClick={() => removeNeverHibernate(domain)} className="orb-control rounded px-2 py-1 text-[10px]">Remove</button>
        </li>)}</ul>}
    </div>

    {error && <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="orb-accent-soft orb-strong rounded-md px-3 py-2 text-xs">{notice}</p>}
  </div>;
}
