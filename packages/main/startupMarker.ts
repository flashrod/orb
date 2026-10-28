import fs from 'node:fs';

/**
 * Cold-start instrumentation.
 *
 * The benchmark needs to know when the shell is actually usable, not when the
 * process was spawned. Writing a marker file is the least invasive way to hand
 * that timestamp back to the harness: it needs no IPC channel, no extra window,
 * and it is inert unless ORB_STARTUP_MARKER is set.
 *
 * Only an explicit environment variable opts in, so a normal launch never
 * touches the filesystem.
 */

export function startupMarkerPath(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.ORB_STARTUP_MARKER;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Writes elapsed milliseconds. Returns false when there is nothing to write. */
export function writeStartupMarker(
  markerPath: string | null,
  elapsedMs: number,
  write: (file: string, data: string) => void = (file, data) => fs.writeFileSync(file, data),
): boolean {
  if (!markerPath) return false;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  try {
    write(markerPath, String(Math.round(elapsedMs)));
    return true;
  } catch {
    return false;
  }
}
