import { useEffect, useState } from 'react';
import { CheckCircle, Globe, WarningCircle } from '@phosphor-icons/react';
import { defaultBrowserHelp } from '../../shared/defaultBrowser';

type DefaultBrowserStatus = { isDefault: boolean; platform: string };

export default function BrowserSettings({ onExportPdf }: { onExportPdf?: () => void }) {
  const [status, setStatus] = useState<DefaultBrowserStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      setStatus(await window.orbApi.getDefaultBrowserStatus());
    } catch {
      setError('Could not read the default browser status.');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const makeDefault = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const next = await window.orbApi.setDefaultBrowser();
      setStatus(next);
      setNotice(next.isDefault
        ? 'Orb is now your default browser.'
        : 'Orb asked the system to become the default. Confirm it in the settings window that opened.');
    } catch {
      setError('Could not change the default browser.');
    } finally {
      setBusy(false);
    }
  };

  const openSystemSettings = async () => {
    try {
      await window.orbApi.openDefaultBrowserSettings();
    } catch {
      setError('Could not open the system settings.');
    }
  };

  const isDefault = status?.isDefault === true;

  return (
    <div className="mx-auto max-w-[680px] space-y-7">
      <section>
        <div className="mb-4">
          <h2 className="orb-strong text-sm font-semibold">Default browser</h2>
          <p className="orb-muted mt-1 text-xs">Open links from Mail, Messages, and other apps directly in Orb.</p>
        </div>

        <div className="orb-elevated rounded-lg border orb-border p-4">
          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isDefault ? 'bg-emerald-700/10 text-emerald-700' : 'orb-accent-soft orb-accent'}`}>
              <Globe aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="orb-strong flex items-center gap-2 text-xs font-medium">
                {isDefault ? 'Orb is your default browser' : 'Orb is not your default browser'}
                {isDefault && <CheckCircle aria-hidden="true" className="h-3.5 w-3.5 text-emerald-700" />}
              </p>
              <p className="orb-muted mt-1 text-[11px] leading-5">{defaultBrowserHelp(status?.platform ?? '')}</p>
            </div>
          </div>

          {!isDefault && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void makeDefault()} className="orb-accent-soft orb-accent rounded-md border border-[var(--orb-accent)] px-3 py-2 text-xs font-medium disabled:opacity-50">
                {busy ? 'Asking…' : 'Set Orb as default'}
              </button>
              <button type="button" disabled={busy} onClick={() => void openSystemSettings()} className="orb-control rounded-md border orb-border px-3 py-2 text-xs disabled:opacity-50">
                Open system settings
              </button>
            </div>
          )}

          {notice && <p role="status" className="orb-muted mt-3 text-[11px]">{notice}</p>}
          {error && <p role="alert" className="mt-3 flex items-center gap-1.5 text-[11px] text-red-700"><WarningCircle aria-hidden="true" className="h-3.5 w-3.5" />{error}</p>}
        </div>
      </section>

      <section className="border-t orb-border pt-6">
        <div className="mb-3">
          <h2 className="orb-strong text-sm font-semibold">Page tools</h2>
          <p className="orb-muted mt-1 text-xs">Export the current page without leaving Orb.</p>
        </div>
        <div className="orb-elevated flex items-center justify-between gap-4 rounded-md border orb-border px-3 py-2.5">
          <div>
            <p className="orb-strong text-xs font-medium">Save page as PDF</p>
            <p className="orb-muted mt-1 text-[10px]">Export the current page with its layout and images. Printing is still ⌘P.</p>
          </div>
          <button
            type="button"
            onClick={onExportPdf}
            disabled={!onExportPdf}
            className="orb-control shrink-0 rounded-md border orb-border px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Save PDF…
          </button>
        </div>
      </section>
    </div>
  );
}
