/**
 * Builds a Chrome-style user agent that does not reveal Orb or Electron.
 *
 * Format:
 *   Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
 *   (KHTML, like Gecko) Chrome/<major>.0.0.0 Safari/537.36
 *
 * The Chromium major version is read from process.versions.chrome so the
 * UA stays in step with the shipping engine. macOS token is the canonical
 * Intel string sites expect; Orb is intentionally never mentioned.
 */
export function buildUserAgent(): string {
  const chromeMajor = process.versions.chrome.split('.')[0] ?? '120';
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
}

export function isSpoofedUserAgent(ua: string): boolean {
  return /orb/i.test(ua) || /electron/i.test(ua);
}
