import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Command, ClockCounterClockwise, Globe, SquaresFour, Plus, MagnifyingGlass, Sparkle, X } from '@phosphor-icons/react';
import { countRestorableTabs, restoreLastSession } from '../lib/restoreSession';
import { useEssentialsStore } from '../stores/essentials';
import { resolveAddressOrSearch, resolveWebsiteAddress } from '../lib/navigation';
import { useBrowserPreferencesStore } from '../stores/preferences';
import { filterEssentialsForContext } from '../lib/essentials';
import { formatRelativeTime } from '../lib/relativeTime';
import { personalizedGreeting } from '../../shared/greeting';

type RecentSite = { url: string; title: string; host: string; visitedAt: number };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

export default function StartPage({
  spaceName,
  spaceId,
  profileId,
  tabCount,
  onNavigate,
}: {
  spaceName: string;
  spaceId: string;
  profileId: string;
  tabCount: number;
  onNavigate: (url: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteError, setSiteError] = useState('');
  const [recent, setRecent] = useState<RecentSite[]>([]);
  const allSites = useEssentialsStore((state) => state.sites);
  const addSite = useEssentialsStore((state) => state.addSite);
  const removeSite = useEssentialsStore((state) => state.removeSite);
  const date = useMemo(() => formatDate(new Date()), []);
  const { searchProvider, essentialsScope, displayName, showRecentSites, setShowRecentSites } = useBrowserPreferencesStore();
  const greeting = useMemo(() => personalizedGreeting(new Date().getHours(), displayName), [displayName]);
  const sites = filterEssentialsForContext(allSites, essentialsScope, spaceId, profileId);
  const [restorableCount, setRestorableCount] = useState(0);
  const [restoreNotice, setRestoreNotice] = useState('');

  useEffect(() => {
    setRestorableCount(countRestorableTabs());
  }, [tabCount]);

  // Recent history fills the right column. Anything already pinned as an
  // essential would be a duplicate, so it stays out of the list.
  useEffect(() => {
    if (!showRecentSites) return;
    let cancelled = false;
    const load = async () => {
      try {
        const entries = await window.orbApi?.recentSites(8);
        if (!cancelled) setRecent(entries ?? []);
      } catch {
        if (!cancelled) setRecent([]);
      }
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [showRecentSites, tabCount]);

  const pinnedHosts = useMemo(() => new Set(sites.map((site) => {
    try {
      return new URL(site.url).hostname;
    } catch {
      return site.url;
    }
  })), [sites]);
  const visibleRecent = recent.filter((entry) => !pinnedHosts.has(entry.host)).slice(0, 6);

  const restoreTabs = () => {
    const restored = restoreLastSession();
    setRestorableCount(countRestorableTabs());
    setRestoreNotice(restored > 0
      ? `Restored ${restored} ${restored === 1 ? 'tab' : 'tabs'} from your last session.`
      : 'Those tabs are already open.');
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const destination = resolveAddressOrSearch(query, searchProvider);
    if (destination) onNavigate(destination);
  };

  const submitEssential = (event: React.FormEvent) => {
    event.preventDefault();
    const url = resolveWebsiteAddress(siteUrl);
    if (!url) {
      setSiteError('Enter a website address such as example.com.');
      return;
    }
    const title = siteName.trim() || new URL(url).hostname;
    addSite({ spaceId, profileId, scope: essentialsScope, title, url });
    setSiteName('');
    setSiteUrl('');
    setSiteError('');
    setAdding(false);
  };

  return (
    <div className="orb-page-enter orb-frame h-full overflow-y-auto">
      <div className="orb-start mx-auto w-full max-w-[1180px] px-6 pb-16 pt-[clamp(36px,7vh,84px)] sm:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="orb-accent-soft orb-accent flex h-7 w-7 items-center justify-center rounded-lg"><Sparkle className="h-3.5 w-3.5" /></span>
            <span className="orb-muted text-[11px] font-semibold uppercase tracking-[0.16em]">{spaceName}</span>
          </div>
          <span className="orb-muted text-xs">{date}</span>
        </div>

        <div className="orb-start-columns mt-6 lg:mt-9">
          <div className="min-w-0">
            <h1 className="orb-serif orb-strong orb-start-title font-medium leading-[1.1] tracking-[-0.035em]">A little room to think.</h1>
            <p className="orb-muted mt-3 max-w-[52ch] text-[15px] leading-6">{greeting}. Your browser, arranged around what matters in this space.</p>

            {restorableCount > 0 && (
              <div className="orb-elevated mt-5 flex flex-wrap items-center gap-3 rounded-lg border orb-border px-3 py-2">
                <ClockCounterClockwise className="orb-accent h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="orb-muted min-w-0 flex-1 text-xs">
                  {restorableCount} {restorableCount === 1 ? 'tab is' : 'tabs are'} not open from your last session.
                </p>
                <button type="button" onClick={restoreTabs} className="orb-accent-bg shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-white">Restore all tabs</button>
              </div>
            )}
            {restoreNotice && <p role="status" className="orb-muted mt-2 text-xs">{restoreNotice}</p>}

            <form onSubmit={submitSearch} className="orb-elevated mt-7 flex h-[58px] w-full max-w-[720px] items-center gap-3 rounded-xl border orb-border px-4 transition-colors focus-within:border-[var(--orb-border-strong)]">
              <MagnifyingGlass aria-hidden="true" className="orb-accent h-[18px] w-[18px] shrink-0" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search or enter a website"
                placeholder="Search the web or enter a website" className="orb-strong orb-placeholder min-w-0 flex-1 bg-transparent text-sm outline-none" />
              <span className="orb-muted hidden items-center gap-1.5 text-[10px] sm:flex"><kbd className="orb-key"><Command className="inline h-3 w-3" /> K</kbd></span>
              <button type="submit" aria-label="Search" className="orb-accent-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white transition-transform hover:scale-[1.03] active:scale-95"><ArrowUpRight className="h-4 w-4" /></button>
            </form>

            <section className="mt-11">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <SquaresFour className="orb-accent h-4 w-4" />
                    <h2 className="orb-strong text-sm font-semibold">Essentials</h2>
                  </div>
                  <p className="orb-muted ml-6 mt-1 text-xs">The places you want close at hand.</p>
                </div>
                <button onClick={() => setAdding((value) => !value)} className="orb-control flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium">
                  {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {adding ? 'Cancel' : 'Add a site'}
                </button>
              </div>

              {adding && (
                <form onSubmit={submitEssential} className="orb-surface mb-4 grid grid-cols-1 gap-2 rounded-lg border orb-border p-3 sm:grid-cols-[1fr_1.4fr_auto]">
                  <input value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Name (optional)" aria-label="Site name" className="orb-strong orb-placeholder h-9 min-w-0 rounded-md border orb-border bg-transparent px-3 text-xs outline-none focus:border-[var(--orb-accent)]" />
                  <input value={siteUrl} onChange={(event) => { setSiteUrl(event.target.value); setSiteError(''); }} placeholder="Website address" aria-label="Website address" aria-invalid={Boolean(siteError)} className="orb-strong orb-placeholder h-9 min-w-0 rounded-md border orb-border bg-transparent px-3 text-xs outline-none focus:border-[var(--orb-accent)]" />
                  <button type="submit" disabled={!siteUrl.trim()} className="orb-accent-bg h-9 rounded-md px-3 text-xs font-medium text-white disabled:opacity-40 sm:h-auto">Save</button>
                  {siteError && <p role="alert" className="col-span-full text-xs text-[var(--orb-accent)]">{siteError}</p>}
                </form>
              )}

              {sites.length === 0 ? (
                <button onClick={() => setAdding(true)} className="orb-surface group flex min-h-[112px] w-full items-center gap-4 rounded-xl border border-dashed orb-border px-5 text-left transition-colors hover:border-[var(--orb-accent)]">
                  <span className="orb-accent-soft orb-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"><Plus className="h-4 w-4" /></span>
                  <span><span className="orb-strong block text-sm font-medium">Pin your first site</span><span className="orb-muted mt-1 block text-xs">Add the places you visit every day.</span></span>
                </button>
              ) : (
                <div className="orb-start-sites">
                  {sites.map((site) => (
                    <div key={site.id} className="orb-elevated group relative rounded-xl border orb-border p-3 transition-colors hover:border-[var(--orb-border-strong)]">
                      <button onClick={() => onNavigate(site.url)} className="flex w-full items-center gap-3 text-left">
                        <span className="orb-accent-soft orb-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"><Globe className="h-4 w-4" /></span>
                        <span className="min-w-0"><span className="orb-strong block truncate text-xs font-medium">{site.title}</span><span className="orb-muted mt-0.5 block truncate text-[10px]">{new URL(site.url).hostname}</span></span>
                      </button>
                      <button aria-label={`Remove ${site.title}`} onClick={() => removeSite(site.id)} className="orb-control absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="min-w-0 lg:pt-1">
            {showRecentSites ? (
              <section aria-labelledby="recent-sites-heading" className="orb-elevated rounded-2xl border orb-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ClockCounterClockwise className="orb-accent h-4 w-4" />
                      <h2 id="recent-sites-heading" className="orb-strong text-sm font-semibold">Recent</h2>
                    </div>
                    <p className="orb-muted ml-6 mt-1 text-xs">Where you left off.</p>
                  </div>
                  <button type="button" onClick={() => setShowRecentSites(false)} className="orb-muted shrink-0 rounded-md px-2 py-1 text-[11px] transition-colors hover:bg-[var(--orb-hover)]">Hide</button>
                </div>

                {visibleRecent.length > 0 ? (
                  <ul className="mt-3 space-y-0.5">
                    {visibleRecent.map((entry) => (
                      <li key={entry.url}>
                        <button type="button" onClick={() => onNavigate(entry.url)} className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--orb-hover)]">
                          <span className="orb-surface flex h-7 w-7 shrink-0 items-center justify-center rounded-md border orb-border"><Globe className="orb-muted h-3.5 w-3.5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="orb-strong block truncate text-xs">{entry.title || entry.host}</span>
                            <span className="orb-muted block truncate text-[10px]">{entry.host}</span>
                          </span>
                          <span className="orb-muted shrink-0 text-[10px] tabular-nums">{formatRelativeTime(entry.visitedAt)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="orb-muted mt-4 rounded-lg border border-dashed orb-border px-3 py-4 text-xs leading-5">Pages you visit will collect here.</p>
                )}
              </section>
            ) : (
              <button type="button" onClick={() => setShowRecentSites(true)} className="orb-muted flex w-full items-center gap-2 rounded-xl border border-dashed orb-border px-3 py-2.5 text-xs transition-colors hover:border-[var(--orb-border-strong)] hover:text-[var(--orb-text)]">
                <ClockCounterClockwise className="h-4 w-4" />
                Show recent sites
              </button>
            )}
          </aside>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t orb-border pt-4">
          <p className="orb-muted text-xs">{tabCount === 0 ? 'No open tabs in this space' : `${tabCount} ${tabCount === 1 ? 'tab' : 'tabs'} in this space`}</p>
          <p className="orb-muted hidden text-[11px] sm:block">Press <kbd className="orb-key orb-strong">⌘K</kbd> to find any tab or space</p>
        </div>
      </div>
    </div>
  );
}
