export interface GroupColor {
  name: string;
  value: string;
}

/** Chrome-style palette, muted to sit inside Orb's warm surfaces. */
export const GROUP_COLORS: GroupColor[] = [
  { name: 'Slate', value: '#6b7280' },
  { name: 'Ocean', value: '#5b7c8d' },
  { name: 'Moss', value: '#657a60' },
  { name: 'Amber', value: '#b08948' },
  { name: 'Clay', value: '#b06a4a' },
  { name: 'Berry', value: '#9a5f74' },
  { name: 'Plum', value: '#7f6396' },
  { name: 'Teal', value: '#4f7f78' },
];

export const DEFAULT_GROUP_COLOR = '#657a60';

export function groupTint(color: string, strength = 14): string {
  return `color-mix(in srgb, ${color} ${strength}%, transparent)`;
}

export function nextGroupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length]?.value ?? DEFAULT_GROUP_COLOR;
}
