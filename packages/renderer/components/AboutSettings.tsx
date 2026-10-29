import { useEffect, useState } from 'react';
import { Check, Copy, WarningCircle } from '@phosphor-icons/react';
import { formatDiagnostics, platformLabel, type BuildInfo } from '../../shared/diagnostics';

const emptyBuildInfo: BuildInfo = { version: '—', electron: '—', chromium: '—', node: '—', platform: '—', arch: '—' };

export default function AboutSettings() {
  const [build, setBuild] = useState<BuildInfo>(emptyBuildInfo);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

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

  const rows: { label: string; value: string }[] = [
    { label: 'Orb', value: build.version },
    { label: 'Electron', value: build.electron },
    { label: 'Chromium', value: build.chromium },
    { label: 'Node', value: build.node },
    { label: 'Platform', value: `${platformLabel(build.platform)} (${build.arch})` },
  ];

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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void copyDiagnostics()} className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs">
            {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy diagnostics'}
          </button>
          <span className="orb-muted text-[10px]">Paste this into a bug report so versions are never a guess.</span>
        </div>
        {error && <p role="alert" className="mt-2 flex items-center gap-1.5 text-[11px] text-red-700"><WarningCircle aria-hidden="true" className="h-3.5 w-3.5" />{error}</p>}
      </section>

      <section className="border-t orb-border pt-6">
        <h3 className="orb-strong text-xs font-semibold">Updates</h3>
        <p className="orb-muted mt-1 text-[11px] leading-5">
          This build does not update itself. Automatic updates need a signed, notarized release, and these builds are unsigned.
          To move to a newer version, download it and replace Orb in Applications.
        </p>
        <p className="orb-muted mt-2 text-[11px] leading-5">
          Settings, history, and profiles stay in <span className="orb-strong font-mono text-[10px]">~/Library/Application Support/Orb</span> and are kept across an upgrade.
        </p>
      </section>
    </div>
  );
}
