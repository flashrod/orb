import React from 'react';
import { ArrowClockwise, Copy, Check, WarningOctagon } from '@phosphor-icons/react';
import { formatDiagnostics, formatErrorReport, type BuildInfo } from '../../shared/diagnostics';

type Props = { children: React.ReactNode };
type State = {
  error: Error | null;
  build: BuildInfo | null;
  copied: boolean;
  reported: boolean;
};

/**
 * A blank window is the worst possible bug report. Any render error in the shell
 * lands here instead, with the message, a reload, and a diagnostics block the
 * tester can paste back.
 *
 * Deliberately a class component: error boundaries have no hook equivalent, and
 * the fallback must not depend on anything that could itself be broken.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, build: null, copied: false, reported: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const report = formatErrorReport(
      error,
      this.state.build ?? emptyBuild,
      typeof navigator === 'undefined' ? '' : navigator.userAgent,
      { at: Date.now() },
    );
    const withComponentStack = `${report}\nComponent stack:${info.componentStack ?? ' (none)'}\n`;

    // Keep a copy on disk so the report survives a reload, and never let
    // diagnostics itself throw a second error.
    try {
      void window.orbApi?.reportRendererError?.({ report: withComponentStack });
      this.setState({ reported: true });
    } catch {
      // Reporting is best effort.
    }

    try {
      void window.orbApi?.getBuildInfo?.().then((build) => this.setState({ build })).catch(() => undefined);
    } catch {
      // Older builds may not expose it.
    }
  }

  private diagnosticsText(): string {
    const build = this.state.build ?? emptyBuild;
    const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    if (this.state.error) {
      return formatErrorReport(this.state.error, build, userAgent, { at: Date.now() });
    }
    return formatDiagnostics(build, userAgent);
  }

  private copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(this.diagnosticsText());
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Clipboard can be unavailable; the text is selectable below anyway.
    }
  };

  private reload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="orb-surface orb-strong flex h-screen w-screen items-center justify-center p-8">
        <div className="w-full max-w-[560px]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700/10 text-red-700">
              <WarningOctagon aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="orb-strong text-sm font-semibold">Orb hit an error</h1>
              <p className="orb-muted mt-0.5 text-xs">The window could not finish drawing. Your tabs and history are safe.</p>
            </div>
          </div>

          <pre className="orb-elevated orb-muted mt-4 max-h-40 overflow-auto rounded-lg border orb-border px-3 py-2 text-[11px] leading-5">
            {this.state.error.message || String(this.state.error)}
          </pre>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={this.reload} className="orb-accent-soft orb-accent flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs font-medium">
              <ArrowClockwise aria-hidden="true" className="h-3.5 w-3.5" />
              Reload Orb
            </button>
            <button type="button" onClick={() => void this.copy()} className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs">
              {this.state.copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
              {this.state.copied ? 'Copied' : 'Copy details'}
            </button>
            {this.state.reported && <span className="orb-muted text-[10px]">Saved to the error log</span>}
          </div>

          <p className="orb-muted mt-4 text-[10px] leading-5">
            If reloading brings the window back, copy the details and send them with a note about what you clicked.
            The same report is written to <span className="orb-strong font-mono">~/Library/Application Support/Orb/orb-errors.log</span>.
          </p>
        </div>
      </div>
    );
  }
}

const emptyBuild: BuildInfo = {
  version: 'unknown',
  electron: 'unknown',
  chromium: 'unknown',
  node: 'unknown',
  platform: 'unknown',
  arch: 'unknown',
};
