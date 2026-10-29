/**
 * "Is there a newer Orb?" — decided from a GitHub release payload.
 *
 * Pure so the rules can be tested without network access. The main process
 * fetches; this module only interprets. Versions follow semver closely enough
 * for a browser: numeric cores, and a prerelease that sorts *below* its final
 * release, so `0.1.0-alpha.2` does not outrank `0.1.0`.
 */

export type UpdateStatus = 'update-available' | 'up-to-date' | 'error';

export interface UpdateCheckResult {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  url: string | null;
  notes: string | null;
  error?: string;
}

interface ParsedVersion {
  core: number[];
  prerelease: string[];
}

/** Returns null for anything that is not a version number. */
export function parseVersion(value: unknown): ParsedVersion | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/^v/i, '');
  if (!text) return null;

  const [core, ...rest] = text.split('+'); // build metadata is ignored
  const [numbers, ...pre] = core.split('-');
  const parts = numbers.split('.');
  if (parts.length === 0 || parts.some((part) => part === '' || !/^\d+$/.test(part))) return null;

  return {
    core: parts.map(Number),
    prerelease: pre.length > 0 ? pre.join('-').split('.') : [],
  };
}

function compareCore(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

function comparePrerelease(a: string[], b: string[]): number {
  // No prerelease means a final release, which is newer than any prerelease.
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;

  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
      const diff = Number(left) - Number(right);
      if (diff !== 0) return diff < 0 ? -1 : 1;
    } else if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1; // numeric identifiers sort lower
    } else if (left !== right) {
      return left < right ? -1 : 1;
    }
  }
  return 0;
}

/** -1 when a < b, 0 when equal, 1 when a > b, null when either is unparseable. */
export function compareVersions(a: unknown, b: unknown): number | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  const core = compareCore(left.core, right.core);
  if (core !== 0) return core;
  return comparePrerelease(left.prerelease, right.prerelease);
}

/**
 * Interprets the GitHub `/releases/latest` payload.
 *
 * A draft, a prerelease, or a malformed tag is reported as an error rather than
 * silently claiming Orb is current.
 */
export function interpretRelease(release: unknown, currentVersion: string): UpdateCheckResult {
  const base: UpdateCheckResult = {
    status: 'error',
    currentVersion,
    latestVersion: null,
    url: null,
    notes: null,
  };

  if (!release || typeof release !== 'object') {
    return { ...base, error: 'No release information was returned.' };
  }

  const payload = release as { tag_name?: unknown; html_url?: unknown; body?: unknown; draft?: unknown; prerelease?: unknown };
  const tag = typeof payload.tag_name === 'string' ? payload.tag_name.trim() : '';
  if (!parseVersion(tag)) {
    return { ...base, error: 'The latest release has no usable version tag.' };
  }
  if (payload.draft === true) {
    return { ...base, error: 'The latest release is still a draft.' };
  }
  if (!parseVersion(currentVersion)) {
    return { ...base, error: `This build reports an unreadable version (${currentVersion}).` };
  }

  const latestVersion = tag.replace(/^v/i, '');
  const url = typeof payload.html_url === 'string' && payload.html_url.startsWith('https://') ? payload.html_url : null;
  const notes = typeof payload.body === 'string' && payload.body.trim() ? payload.body.trim() : null;
  const comparison = compareVersions(latestVersion, currentVersion);

  return {
    status: comparison === null ? 'error' : comparison > 0 ? 'update-available' : 'up-to-date',
    currentVersion,
    latestVersion,
    url,
    notes,
    error: comparison === null ? 'Versions could not be compared.' : undefined,
  };
}
