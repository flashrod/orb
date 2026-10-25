/**
 * Platform guidance for becoming the default browser.
 *
 * macOS and Windows both require an explicit user confirmation outside the
 * app, so the UI can only explain where to confirm it.
 */

export type DesktopPlatform = 'darwin' | 'win32' | 'linux' | string;

export function defaultBrowserHelp(platform: DesktopPlatform): string {
  if (platform === 'darwin') {
    return 'macOS confirms this in System Settings → Desktop & Dock → Default web browser. Orb will appear there after the first launch.';
  }
  if (platform === 'win32') {
    return 'Windows confirms this in Settings → Apps → Default apps. Search for Orb and choose it for HTTP and HTTPS.';
  }
  return 'Your desktop environment controls the default browser. Use its settings to choose Orb for HTTP and HTTPS links.';
}

export function defaultBrowserSettingsUrl(platform: DesktopPlatform): string | null {
  if (platform === 'darwin') return 'x-apple.systempreferences:com.apple.Desktop-Settings.extension';
  if (platform === 'win32') return 'ms-settings:defaultapps';
  return null;
}
