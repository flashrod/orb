/**
 * Validation for values handed to the main process, kept out of the IPC file so
 * the rules can be tested without booting Electron.
 */

export const DEFAULT_STRING_LIMIT = 2048;

/**
 * Prefilled GitHub issue links carry a whole report in the query string, so
 * external opens get a much larger allowance. The URL is only passed to the
 * system browser; nothing is fetched with it here.
 */
export const EXTERNAL_URL_LIMIT = 16_000;

export function requireString(value: unknown, label: string, maxLength = DEFAULT_STRING_LIMIT): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

/** Only http(s) URLs may leave Orb. Everything else is a bug or an attack. */
export function requireWebUrl(value: unknown): string {
  const raw = requireString(value, 'URL', EXTERNAL_URL_LIMIT);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs can be opened externally.');
  }
  return parsed.toString();
}
