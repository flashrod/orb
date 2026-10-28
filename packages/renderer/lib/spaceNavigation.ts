/**
 * Pure helpers behind the Space shortcut commands. Kept separate from the
 * stores so the cycling rules can be tested without mounting the shell.
 */

/** Wrap an index into `[0, length)`; an out-of-range or negative input wraps. */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

/** Index of the space reached by moving `offset` places from `currentIndex`. */
export function nextSpaceIndex(currentIndex: number, length: number, offset: number): number {
  if (length <= 0) return -1;
  if (currentIndex < 0) return offset < 0 ? length - 1 : 0;
  return wrapIndex(currentIndex + offset, length);
}

/**
 * Profile id that follows `currentProfileId` in `profileIds`. Returns the first
 * profile when the current one is unknown, and null when there is nothing to
 * cycle through.
 */
export function nextProfileId(profileIds: string[], currentProfileId: string | undefined): string | null {
  if (profileIds.length === 0) return null;
  if (profileIds.length === 1) return profileIds[0];
  const index = currentProfileId ? profileIds.indexOf(currentProfileId) : -1;
  return profileIds[wrapIndex(index + 1, profileIds.length)];
}
