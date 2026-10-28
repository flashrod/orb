import React, { useEffect, useState } from 'react';
import { Check, Shield, Trash, WarningCircle } from '@phosphor-icons/react';
import Toggle from './ui/Toggle';
import { groupPermissions, permissionLabel, type PermissionEntry } from '../lib/permissionsView';
import { describePlan } from '../../shared/browsingData';

type BlockedRequest = { id: string; request: string; site: string; resourceType: string; rule: string; blockedAt: number };
type FilterList = { id: string; name: string; url: string; enabled: boolean; custom?: boolean; ruleCount: number; error: string | null; lastUpdated: number | null };
type Status = { enabled: boolean; ruleCount: number; trackerBlockingEnabled: boolean; trackerRuleCount: number; httpsOnlyEnabled: boolean; httpsExceptions: string[]; thirdPartyCookieBlockingEnabled: boolean; webRtcProtectionEnabled: boolean; fingerprintingProtectionEnabled: boolean; allowlist: string[]; blockedRequests: BlockedRequest[]; filterLists: FilterList[] };

const emptyStatus: Status = { enabled: true, ruleCount: 0, trackerBlockingEnabled: true, trackerRuleCount: 0, httpsOnlyEnabled: true, httpsExceptions: [], thirdPartyCookieBlockingEnabled: true, webRtcProtectionEnabled: true, fingerprintingProtectionEnabled: true, allowlist: [], blockedRequests: [], filterLists: [] };

const clearOptions = [
  { id: 'history', label: 'Browsing history', detail: 'Pages you visited and the suggestions built from them.' },
  { id: 'cache', label: 'Cached files', detail: 'Images and scripts stored to load pages faster.' },
  { id: 'cookies', label: 'Cookies', detail: 'Signs you out of most sites.' },
  { id: 'siteData', label: 'Site data', detail: 'Local storage, IndexedDB and service workers.' },
] as const;

export default function PrivacySettings({ activeUrl }: { activeUrl?: string }) {
  const [status, setStatus] = useState<Status>(emptyStatus);
  const [domain, setDomain] = useState('');
  const [httpsDomain, setHttpsDomain] = useState('');
  const [clearSelection, setClearSelection] = useState({ history: true, cache: true, cookies: false, siteData: false });
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearNotice, setClearNotice] = useState('');
  const [filterUrl, setFilterUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState('');
  const activeDomain = (() => { try { return new URL(activeUrl || '').hostname; } catch { return ''; } })();

  const refresh = async () => {
    try {
      const next = await window.orbApi.getAdBlockerStatus();
      setStatus({ ...emptyStatus, ...next, blockedRequests: next.blockedRequests || [], filterLists: next.filterLists || [] });
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read privacy status.'); }
  };
  useEffect(() => { void refresh(); void refreshPermissions(); }, []);

  const refreshPermissions = async () => {
    try {
      const entries = await window.orbApi.getPermissions();
      setPermissions(Array.isArray(entries) ? entries as PermissionEntry[] : []);
    } catch {
      // A missing registry only means there are no saved choices yet.
    }
  };

  const updatePermission = async (host: string, permission: string, state: 'allow' | 'deny' | 'ask') => {
    setPermissionBusy(true);
    setPermissionNotice('');
    try {
      if (state === 'ask') await window.orbApi.removePermission(host, permission);
      else await window.orbApi.setPermission(host, permission, state);
      await refreshPermissions();
      setPermissionNotice(state === 'ask'
        ? `${permissionLabel(permission)} for ${host} will ask again.`
        : `${permissionLabel(permission)} for ${host} is now ${state === 'allow' ? 'allowed' : 'blocked'}.`);
    } finally {
      setPermissionBusy(false);
    }
  };

  const resetPermissions = async () => {
    setPermissionBusy(true);
    setPermissionNotice('');
    try {
      for (const entry of permissions) {
        await window.orbApi.removePermission(entry.host, entry.permission);
      }
      await refreshPermissions();
      setPermissionNotice('All site permission choices were reset.');
    } finally {
      setPermissionBusy(false);
    }
  };

  const permissionGroups = groupPermissions(permissions);

  const update = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update this protection.'); }
    finally { setBusy(false); }
  };
  const saveDomain = async (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const allowlist = await window.orbApi.addAdBlockerAllowlist(clean);
      setStatus((current) => ({ ...current, allowlist }));
      setDomain(''); setNotice(`Shield exception added for ${clean}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add this site exception.'); }
    finally { setBusy(false); }
  };

  const saveHttpsException = async (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const httpsExceptions = await window.orbApi.addHttpsException(clean);
      setStatus((current) => ({ ...current, httpsExceptions }));
      setHttpsDomain('');
      setNotice(`${clean} will load over HTTP without being upgraded.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add this HTTPS exception.'); }
    finally { setBusy(false); }
  };

  const clearBrowsingData = async () => {
    setBusy(true); setError(''); setNotice(''); setClearNotice('');
    try {
      const result = await window.orbApi.clearBrowsingData(clearSelection);
      if (!result.ok) throw new Error(result.error || 'Could not clear browsing data.');
      const scope = result.profiles && result.profiles > 1 ? ` across ${result.profiles} profiles` : '';
      setClearNotice(`Cleared ${describePlan(result.labels)}${scope}.`);
      setConfirmingClear(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not clear browsing data.');
    } finally { setBusy(false); }
  };

  const rows = [
    { label: 'Block ads and page trackers', description: `${status.ruleCount.toLocaleString()} advertising rules loaded`, checked: status.enabled, toggle: () => update(() => window.orbApi.toggleAdBlocker(!status.enabled)) },
    { label: 'Block known trackers and cookie scripts', description: `${status.trackerRuleCount.toLocaleString()} privacy rules loaded`, checked: status.trackerBlockingEnabled, toggle: () => update(() => window.orbApi.toggleTrackerBlocking(!status.trackerBlockingEnabled)) },
    { label: 'Prefer HTTPS connections', description: 'Upgrade page loads from HTTP to HTTPS. A site with no working HTTPS falls back automatically and is listed below.', checked: status.httpsOnlyEnabled, toggle: () => update(() => window.orbApi.toggleHttpsOnly(!status.httpsOnlyEnabled)) },
    { label: 'Block third-party cookies', description: 'Strip cross-site Cookie and Set-Cookie headers. Some embedded sign-in flows may need an exception.', checked: status.thirdPartyCookieBlockingEnabled, toggle: () => update(() => window.orbApi.setThirdPartyCookieBlocking(!status.thirdPartyCookieBlockingEnabled)) },
    { label: 'Reduce fingerprinting signals', description: 'Limit Client Hints, normalize language detail, and send Do Not Track and Global Privacy Control signals.', checked: status.fingerprintingProtectionEnabled, toggle: () => update(() => window.orbApi.setFingerprintingProtection(!status.fingerprintingProtectionEnabled)) },
    { label: 'Limit WebRTC IP exposure', description: 'Use Chromium’s disable-non-proxied-UDP policy for profile sessions; VPN and relay behavior can vary.', checked: status.webRtcProtectionEnabled, toggle: () => update(() => window.orbApi.setWebRtcProtection(!status.webRtcProtectionEnabled)) },
  ];

  return <div className="mx-auto max-w-[720px] space-y-7">
    <section>
      <div className="mb-4"><h2 className="orb-strong text-sm font-semibold">Shields</h2><p className="orb-muted mt-1 text-xs">These controls apply in Chromium sessions. Exceptions apply to the site you add and its subdomains.</p></div>
      <div className="space-y-2">
        {rows.map((row) => <div key={row.label} className="orb-elevated flex items-center justify-between gap-4 rounded-lg border orb-border p-4"><div className="flex min-w-0 items-center gap-3"><div className="orb-accent-soft orb-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-md"><Shield className="h-4 w-4" /></div><div><p className="orb-strong text-xs font-medium">{row.label}</p><p className="orb-muted mt-1 text-[11px]">{row.description}</p></div></div><Toggle checked={row.checked} onChange={row.toggle} label={row.label} disabled={busy} /></div>)}
      </div>
    </section>

    {(status.httpsOnlyEnabled || status.httpsExceptions.length > 0) && <section className="border-t orb-border pt-5">
      <h3 className="orb-strong text-xs font-semibold">HTTPS exceptions</h3>
      <p className="orb-muted mt-1 text-[11px]">Sites here are never upgraded to HTTPS. Orb adds a site automatically when its HTTPS address cannot be reached.</p>
      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void saveHttpsException(httpsDomain); }}><input value={httpsDomain} onChange={(event) => setHttpsDomain(event.target.value)} aria-label="Site to load over HTTP" placeholder="legacy.example.com" className="orb-strong orb-placeholder h-9 min-w-0 flex-1 rounded-md border orb-border bg-transparent px-3 text-xs outline-none focus:border-[var(--orb-accent)]" /><button type="submit" disabled={busy || !httpsDomain.trim()} className="orb-control rounded-md border orb-border px-3 text-xs disabled:opacity-50">Add exception</button></form>
      {status.httpsExceptions.length > 0
        ? <div className="mt-3 space-y-1">{status.httpsExceptions.map((item) => <div key={item} className="orb-elevated flex items-center gap-3 rounded-md border orb-border px-3 py-2"><span className="orb-strong min-w-0 flex-1 truncate text-xs">{item}</span><span className="orb-muted text-[10px]">HTTP allowed</span><button type="button" aria-label={`Remove HTTPS exception for ${item}`} onClick={() => void update(() => window.orbApi.removeHttpsException(item))} className="orb-control rounded px-2 py-1 text-[10px]">Remove</button></div>)}</div>
        : <div className="orb-elevated orb-muted mt-3 rounded-md border orb-border px-3 py-3 text-[11px]">No exceptions. Every plain-HTTP page load is upgraded.</div>}
    </section>}

    <section className="border-t orb-border pt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="orb-strong text-xs font-semibold">Site permissions</h3>
          <p className="orb-muted mt-1 text-[11px]">Camera, microphone, location, notifications and screen sharing you have decided for each site.</p>
        </div>
        {permissions.length > 0 && <button type="button" disabled={permissionBusy} onClick={() => void resetPermissions()} className="orb-control rounded-md border orb-border px-2.5 py-1.5 text-[10px] disabled:opacity-50">Reset all</button>}
      </div>
      {permissionGroups.length === 0
        ? <div className="orb-elevated orb-muted mt-3 rounded-md border orb-border px-3 py-4 text-[11px]">No saved choices yet. Sites will ask before using sensitive features.</div>
        : <div className="mt-3 space-y-2">{permissionGroups.map((group) => <div key={group.host} className="orb-elevated rounded-lg border orb-border p-3">
          <p className="orb-strong truncate text-xs" title={group.host}>{group.host}</p>
          <div className="mt-2 space-y-1.5">{group.entries.map((entry) => <div key={entry.permission} className="flex items-center gap-2">
            <span className="orb-muted min-w-0 flex-1 truncate text-[11px]">{permissionLabel(entry.permission)}</span>
            <select
              aria-label={`${permissionLabel(entry.permission)} for ${group.host}`}
              value={entry.state}
              disabled={permissionBusy}
              onChange={(event) => void updatePermission(group.host, entry.permission, event.target.value as 'allow' | 'deny' | 'ask')}
              className="orb-control h-7 rounded-md border orb-border bg-transparent px-1.5 text-[11px]"
            >
              <option value="allow">Allow</option>
              <option value="deny">Block</option>
              <option value="ask">Ask</option>
            </select>
            <button type="button" aria-label={`Forget ${permissionLabel(entry.permission)} for ${group.host}`} disabled={permissionBusy} onClick={() => void updatePermission(group.host, entry.permission, 'ask')} className="orb-control rounded px-2 py-1 text-[10px] disabled:opacity-50">Forget</button>
          </div>)}</div>
        </div>)}</div>}
      {permissionNotice && <p role="status" className="orb-accent-soft orb-strong mt-3 rounded-md px-3 py-2 text-xs">{permissionNotice}</p>}
    </section>
    <section className="border-t orb-border pt-5">
      <h3 className="orb-strong text-xs font-semibold">Site exceptions</h3><p className="orb-muted mt-1 text-[11px]">Turn off network blocking for a site when a page needs it to work.</p>
      {activeDomain && <button type="button" disabled={busy || status.allowlist.some((item) => item === activeDomain || activeDomain.endsWith(`.${item}`))} onClick={() => void saveDomain(activeDomain)} className="orb-control mt-3 rounded-md border orb-border px-3 py-2 text-xs disabled:opacity-50">{status.allowlist.some((item) => item === activeDomain || activeDomain.endsWith(`.${item}`)) ? `Shield exception active for ${activeDomain}` : `Allow this site · ${activeDomain}`}</button>}
      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void saveDomain(domain); }}><input value={domain} onChange={(event) => setDomain(event.target.value)} aria-label="Site to allow" placeholder="example.com" className="orb-strong orb-placeholder h-9 min-w-0 flex-1 rounded-md border orb-border bg-transparent px-3 text-xs outline-none focus:border-[var(--orb-accent)]" /><button type="submit" disabled={busy || !domain.trim()} className="orb-accent-bg rounded-md px-3 text-xs text-white disabled:opacity-50">Add exception</button></form>
      {status.allowlist.length > 0 && <div className="mt-3 space-y-1">{status.allowlist.map((item) => <div key={item} className="orb-elevated flex items-center gap-3 rounded-md border orb-border px-3 py-2"><span className="orb-strong min-w-0 flex-1 truncate text-xs">{item}</span><Check className="orb-accent h-3.5 w-3.5" /><button type="button" aria-label={`Remove exception for ${item}`} onClick={() => void update(() => window.orbApi.removeAdBlockerAllowlist(item))} className="orb-control rounded px-2 py-1 text-[10px]">Remove</button></div>)}</div>}
    </section>
    <section className="border-t orb-border pt-5">
      <h3 className="orb-strong text-xs font-semibold">Clear browsing data</h3>
      <p className="orb-muted mt-1 text-[11px]">Remove data from Orb only. Other browsers are not touched.</p>
      <div className="mt-3 space-y-1.5">{clearOptions.map((option) => (
        <label key={option.id} className="orb-elevated flex cursor-pointer items-start gap-3 rounded-md border orb-border px-3 py-2">
          <input
            type="checkbox"
            aria-label={option.label}
            checked={clearSelection[option.id]}
            onChange={(event) => {
              const checked = event.target.checked;
              setClearSelection((current) => ({ ...current, [option.id]: checked }));
              setConfirmingClear(false);
            }}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--orb-accent)]"
          />
          <span className="min-w-0"><span className="orb-strong block text-[11px]">{option.label}</span><span className="orb-muted mt-0.5 block text-[10px]">{option.detail}</span></span>
        </label>
      ))}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => { if (confirmingClear) void clearBrowsingData(); else setConfirmingClear(true); }}
          className={`rounded-md px-3 py-2 text-xs disabled:opacity-50 ${confirmingClear ? 'bg-red-700 text-white' : 'orb-control border orb-border'}`}
        >
          {confirmingClear ? 'Confirm clear' : 'Clear selected data'}
        </button>
        {confirmingClear && <button type="button" onClick={() => setConfirmingClear(false)} className="orb-control rounded-md border orb-border px-3 py-2 text-xs">Cancel</button>}
        <span className="orb-muted text-[10px]">{confirmingClear ? 'This cannot be undone. Open tabs keep their current content.' : 'Choose what to remove, then confirm.'}</span>
      </div>
      {clearNotice && <p role="status" className="orb-accent-soft orb-strong mt-3 rounded-md px-3 py-2 text-xs">{clearNotice}</p>}
    </section>
    <section className="border-t orb-border pt-5">
      <div className="flex items-start justify-between gap-4"><div><h3 className="orb-strong text-xs font-semibold">Filter lists</h3><p className="orb-muted mt-1 text-[11px]">Choose which HTTPS lists are active. Refresh fetches the latest rules.</p></div><button type="button" disabled={busy} onClick={() => void update(() => window.orbApi.refreshFilterLists())} className="orb-control rounded-md border orb-border px-2.5 py-1.5 text-[10px]">Refresh lists</button></div>
      <div className="mt-3 space-y-1.5">{status.filterLists.map((list) => <div key={list.id} className="orb-elevated flex items-center gap-3 rounded-md border orb-border px-3 py-2"><span className="min-w-0 flex-1"><span className="orb-strong block truncate text-[11px]">{list.name}{list.custom ? ' · custom' : ''}</span><span className="orb-muted block truncate text-[10px]">{list.error ? `Update failed: ${list.error}` : `${list.ruleCount.toLocaleString()} rules · ${list.lastUpdated ? `updated ${new Date(list.lastUpdated).toLocaleString()}` : 'not loaded yet'}`}</span></span><Toggle checked={list.enabled} onChange={() => void update(() => window.orbApi.setFilterListEnabled(list.id, !list.enabled))} label={`Enable ${list.name}`} disabled={busy} />{list.custom && <button type="button" disabled={busy} onClick={() => void update(() => window.orbApi.removeFilterList(list.id))} className="orb-control rounded px-2 py-1 text-[10px]">Remove</button>}</div>)}</div>
      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void update(() => window.orbApi.addFilterList(filterUrl)).then(() => setFilterUrl('')); }}><input type="url" value={filterUrl} onChange={(event) => setFilterUrl(event.target.value)} aria-label="Custom filter list URL" placeholder="https://filters.example/list.txt" className="orb-strong orb-placeholder h-9 min-w-0 flex-1 rounded-md border orb-border bg-transparent px-3 text-xs outline-none focus:border-[var(--orb-accent)]" /><button type="submit" disabled={busy || !filterUrl} className="orb-control rounded-md border orb-border px-3 text-xs disabled:opacity-50">Add HTTPS list</button></form>
    </section>
    <section className="border-t orb-border pt-5">
      <div className="flex items-start justify-between gap-4"><div><h3 className="orb-strong text-xs font-semibold">Blocked requests</h3><p className="orb-muted mt-1 text-[11px]">Recent matches · up to 500 entries, with query strings removed.</p></div><button type="button" disabled={!status.blockedRequests.length || busy} onClick={() => void update(() => window.orbApi.clearBlockedRequestLog())} className="orb-control flex items-center gap-1 rounded-md border orb-border px-2.5 py-1.5 text-[10px] disabled:opacity-50"><Trash className="h-3 w-3" />Clear log</button></div>
      {status.blockedRequests.length ? <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">{status.blockedRequests.map((entry) => <div key={entry.id} className="orb-elevated grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border orb-border px-3 py-2"><span className="min-w-0"><span className="orb-strong block truncate text-[11px]" title={entry.request}>{entry.request}</span><span className="orb-muted mt-1 block truncate text-[10px]">On {entry.site} · {entry.resourceType} · {entry.rule}</span></span><time className="orb-muted text-[9px]">{new Date(entry.blockedAt).toLocaleTimeString()}</time></div>)}</div> : <div className="orb-elevated orb-muted mt-3 flex items-center gap-2 rounded-md border orb-border px-3 py-4 text-[11px]"><WarningCircle className="h-4 w-4" />No blocked requests in this session yet.</div>}
    </section>
    {error && <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="orb-accent-soft rounded-md px-3 py-2 text-xs orb-strong">{notice}</p>}
  </div>;
}
