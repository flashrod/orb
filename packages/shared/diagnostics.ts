/**
 * Text an alpha tester can paste into a bug report.
 *
 * Kept pure and free of Electron imports so both the About panel and the error
 * boundary produce the same block, and so it can be unit-tested.
 */

export interface BuildInfo {
  version: string;
  electron: string;
  chromium: string;
  node: string;
  platform: string;
  arch: string;
}

export function platformLabel(platform: string): string {
  if (platform === 'darwin') return 'macOS';
  if (platform === 'win32') return 'Windows';
  if (platform === 'linux') return 'Linux';
  return platform || '—';
}

export function formatDiagnostics(build: BuildInfo, userAgent: string): string {
  return [
    `Orb ${build.version}`,
    `Electron ${build.electron}`,
    `Chromium ${build.chromium}`,
    `Node ${build.node}`,
    `${platformLabel(build.platform)} ${build.arch}`,
    `User agent: ${userAgent}`,
  ].join('\n');
}

/**
 * A crash report: what broke, then the same environment block. The stack is
 * included because "it went blank" on its own is not actionable.
 */
export function formatErrorReport(
  error: unknown,
  build: BuildInfo,
  userAgent: string,
  extra: { url?: string; at?: number } = {},
): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const stack = error instanceof Error && error.stack ? error.stack : '(no stack)';
  return [
    '# Orb error report',
    '',
    `Message: ${message}`,
    extra.url ? `Page: ${extra.url}` : null,
    extra.at ? `When: ${new Date(extra.at).toISOString()}` : null,
    '',
    'Stack:',
    stack,
    '',
    '# Environment',
    formatDiagnostics(build, userAgent),
    '',
  ].filter((line) => line !== null).join('\n');
}
