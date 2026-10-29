import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, ChatCircleText, Check, Copy, WarningCircle } from '@phosphor-icons/react';
import { formatDiagnostics, platformLabel, type BuildInfo } from '../../shared/diagnostics';
import { feedbackIssueUrl } from '../../shared/feedback';
import type { UpdateCheckResult } from '../../shared/updates';

const emptyBuildInfo: BuildInfo = { version: '—', electron: '—', chromium: '—', node: '—', platform: '—', arch: '—' };

export default function AboutSettings() {
  const [build, setBuild] = useState<BuildInfo>(emptyBuildInfo);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [update, setUpdate] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const info = await window.orbApi.getBuildInfo();
        if (!cancelled) setBuild(info);
      } catch {
        if (!cancelled) setError('Could not read build information.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    try {
      setUpdate(await window.orbApi.checkForUpdates());
    } catch {
      setUpdate({ status: 'error', currentVersion: build.version, latestVersion: null, url: null, notes: null, error: 'The update check could not run.' });
    } finally {
      setChecking(false);
    }
  }, [build.version]);

  // One check when the panel opens. Manual re-checks are a click away; GitHub
  // rate-limits anonymous requests, so this is deliberately not on a timer.
  useEffect(() => { void checkForUpdates(); }, [checkForUpdates]);

  const rows: { label: string; value: string }[] = [
    { label: 'Orb', value: build.version },
    { label: 'Electron', value: build.electron },
    { label: 'Chromium', value: build.chromium },
    { label: 'Node', value: build.node },
    { label: 'Platform', value: `${platformLabel(build.platform)} (${build.arch})` },
  ];

  const openFeedback = async () => {
    try {
      await window.orbApi.openExternal(feedbackIssueUrl(build, navigator.userAgent));
      setError('');
    } catch {
      setError('Could not open your browser. Copy diagnostics instead and send them however you like.');
    }
  };

  const copyDiagnostics = async () => {
    const text = formatDiagnostics(build, navigator.userAgent);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError('');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the text above instead.');
    }
  };

  return (
    <div className="mx-auto max-w-[680px] space-y-7">
      <section>
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="orb-accent-soft orb-accent flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold">O</div>
          <div>
            <h2 className="orb-strong text-sm font-semibold">Orb</h2>
            <p className="orb-muted mt-0.5 text-xs">A calmer browser for the way you actually browse.</p>
          </div>
        </div>
      </section>

      <section className="border-t orb-border pt-6">
        <h3 className="orb-strong text-xs font-semibold">Build</h3>
        <dl className="orb-elevated mt-3 divide-y divide-[var(--orb-border)] rounded-lg border orb-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="orb-muted text-[11px]">{row.label}</dt>
              <dd className="orb-strong font-mono text-[11px] tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        {error && <p role="alert" className="mt-2 flex items-center gap-1.5 text-[11px] text-red-700"><WarningCircle aria-hidden="true" className="h-3.5 w-3.5" />{error}</p>}
      </section>

      <section className="border-t orb-border pt-6">
        <h3 className="orb-strong text-xs font-semibold">Feedback</h3>
        <p className="orb-muted mt-1 text-[11px] leading-5">
          Alpha builds are expected to break. If something looks wrong, say so — a rough description is more useful than a polished one.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void openFeedback()}
            className="orb-accent-soft orb-accent flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs font-medium"
          >
            <ChatCircleText aria-hidden="true" className="h-3.5 w-3.5" />
            Send feedback
          </button>
          <button type="button" onClick={() => void copyDiagnostics()} className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs">
            {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy diagnostics'}
          </button>
        </div>
        <p className="orb-muted mt-2 text-[10px] leading-5">
          Opens a GitHub issue in your browser with your Orb, Electron and macOS versions already filled in. Nothing is sent until you press Submit.
        </p>
      </section>

      <section className="border-t orb-border pt-6">
        <h3 className="orb-strong text-xs font-semibold">Updates</h3>

        <div className="orb-elevated mt-3 rounded-lg border orb-border px-3 py-3">
          {checking && <p className="orb-muted text-[11px]">Checking for updates…</p>}
          {!checking && update?.status === 'update-available' && <>
            <p className="orb-strong text-[11px]">Orb {update.latestVersion} is available.</p>
            <p className="orb-muted mt-0.5 text-[10px]">You are on {update.currentVersion}. Download the new build and replace Orb in Applications.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {update.url && <button type="button" onClick={() => void window.orbApi.openExternal(update.url as string)} className="orb-accent-soft orb-accent rounded-md border orb-border px-3 py-1.5 text-[11px] font-medium">Open release page</button>}
              <button type="button" onClick={() => void checkForUpdates()} className="orb-control rounded-md border orb-border px-3 py-1.5 text-[11px]">Check again</button>
            </div>
          </>}
          {!checking && update?.status === 'up-to-date' && <>
            <p className="orb-strong text-[11px]">Orb {update.currentVersion} is the latest release.</p>
            <button type="button" onClick={() => void checkForUpdates()} className="orb-muted mt-1 flex items-center gap-1 text-[10px]"><ArrowClockwise aria-hidden="true" className="h-3 w-3" />Check again</button>
          </>}
          {!checking && update?.status === 'error' && <>
            <p className="orb-muted text-[11px]">{update.error || 'The update check failed.'}</p>
            <button type="button" onClick={() => void checkForUpdates()} className="orb-control mt-2 rounded-md border orb-border px-3 py-1.5 text-[11px]">Try again</button>
          </>}
        </div>

        <p className="orb-muted mt-3 text-[11px] leading-5">
          This build does not update itself: automatic updates need a signed, notarized release, and these builds are unsigned.
          Settings, history, and profiles live in <span className="orb-strong font-mono text-[10px]">~/Library/Application Support/Orb</span> and are kept when you replace the app.
        </p>
      </section>
    </div>
  );
}
