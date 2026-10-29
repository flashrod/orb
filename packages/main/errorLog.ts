import fs from 'node:fs';
import path from 'node:path';

/**
 * Renderer crash log.
 *
 * Alpha testers will not have a debugger attached, so a render error has to
 * leave a file behind. One rotated file, capped in size: an error loop must not
 * fill the disk, and the newest report is always the one that matters.
 */

export const ERROR_LOG_MAX_BYTES = 512 * 1024;
export const ERROR_LOG_NAME = 'orb-errors.log';

export interface AppendOptions {
  maxBytes?: number;
  now?: number;
}

/** Appends one timestamped entry, rotating the file when it grows past the cap. */
export function appendErrorLog(file: string, entry: string, options: AppendOptions = {}): boolean {
  const maxBytes = options.maxBytes ?? ERROR_LOG_MAX_BYTES;
  const text = String(entry ?? '').trim();
  if (!text) return false;

  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });

    let size = 0;
    try { size = fs.statSync(file).size; } catch { size = 0; }

    if (size > maxBytes) {
      try { fs.renameSync(file, `${file}.1`); } catch { /* rotation is best effort */ }
    }

    const stamp = new Date(options.now ?? Date.now()).toISOString();
    fs.appendFileSync(file, `\n=== ${stamp} ===\n${text}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/** Trims a report so a pathological error cannot blow past the log cap. */
export function clampReport(text: unknown, maxChars = 60_000): string {
  if (typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars)}\n… truncated` : trimmed;
}
