/** A small, time-aware hello used on the new tab page. */
export type DayGreeting = 'Good morning' | 'Good afternoon' | 'Good evening';

export function greetingForHour(hour: number): DayGreeting {
  if (!Number.isFinite(hour)) return 'Good morning';
  const normalized = ((Math.trunc(hour) % 24) + 24) % 24;
  if (normalized < 12) return 'Good morning';
  if (normalized < 18) return 'Good afternoon';
  return 'Good evening';
}

export function personalizedGreeting(hour: number, name?: string): string {
  const base = greetingForHour(hour);
  const trimmed = name?.trim();
  return trimmed ? `${base}, ${trimmed}` : base;
}
