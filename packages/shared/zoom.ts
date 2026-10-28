/**
 * Browser zoom steps. Mirrors the values Chrome uses so the shortcut feels
 * familiar, and keeps every step inside a range that stays readable.
 */
export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5] as const;

export const MIN_ZOOM = ZOOM_STEPS[0];
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

export type ZoomDirection = 'in' | 'out' | 'reset';

export function clampZoom(factor: number): number {
  if (!Number.isFinite(factor)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, factor));
}

/**
 * Next zoom factor for a direction. "reset" always returns 1, and stepping
 * past either end of the list stays put instead of wrapping.
 */
export function nextZoomFactor(current: number, direction: ZoomDirection): number {
  if (direction === 'reset') return 1;
  const factor = clampZoom(current);
  if (direction === 'in') {
    return ZOOM_STEPS.find((step) => step > factor + 0.001) ?? MAX_ZOOM;
  }
  const below = ZOOM_STEPS.filter((step) => step < factor - 0.001);
  return below.length > 0 ? below[below.length - 1] : MIN_ZOOM;
}
