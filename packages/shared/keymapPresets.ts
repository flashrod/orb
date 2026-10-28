/**
 * Keymap presets: named collections of binding overrides that users can apply
 * to switch Orb's shortcuts between Chrome-like, Safari-like, and Arc-like
 * muscle memory.
 *
 * A preset maps command ids to binding arrays. An empty array unbinds the
 * command. Applying a preset replaces every stored override; commands not
 * mentioned by a preset keep their defaults (or any user overrides that were
 * in place before the preset was applied — presets are a starting point, not
 * a lock).
 */

export interface KeymapPreset {
  /** Stable identifier, stored in preferences. */
  id: string;
  /** Human-readable name shown in the settings preset picker. */
  name: string;
  /** Short description of what makes the preset different. */
  description: string;
  /** Command id → bindings. Empty array = explicitly unbound. */
  overrides: Record<string, string[]>;
}

/** macOS-first bindings; the renderer normalizes Mod→Meta/Ctrl per platform. */

export const PRESETS: readonly KeymapPreset[] = [
  {
    id: 'chrome',
    name: 'Chrome',
    description: 'Chrome/Edge-style shortcuts on macOS.',
    overrides: {
      'tab.reopen-closed': ['Mod+Shift+T'],
      'tab.next': ['Ctrl+Tab'],
      'tab.previous': ['Ctrl+Shift+Tab'],
      'nav.back': ['Mod['],
      'nav.forward': ['Mod]'],
      'nav.reload': ['Mod+R'],
      'nav.hard-reload': ['Mod+Shift+R'],
      'focus-address': ['Mod+L'],
      'view.zoom-in': ['Mod+='],
      'view.zoom-out': ['Mod+-'],
      'view.zoom-reset': ['Mod+0'],
      'new-tab': ['Mod+T'],
      'tab.close': ['Mod+W'],
    },
  },
  {
    id: 'safari',
    name: 'Safari',
    description: 'Safari-style shortcuts: Cmd+Z reopens closed tabs.',
    overrides: {
      'tab.reopen-closed': ['Mod+Z'],
      'tab.next': ['Mod+Option+ArrowRight'],
      'tab.previous': ['Mod+Option+ArrowLeft'],
      'nav.back': ['Mod['],
      'nav.forward': ['Mod]'],
      'nav.reload': ['Mod+R'],
      'focus-address': ['Mod+L'],
      'view.zoom-in': ['Mod+='],
      'view.zoom-out': ['Mod+-'],
      'view.zoom-reset': ['Mod+0'],
      'new-tab': ['Mod+T'],
      'tab.close': ['Mod+W'],
      'space.next': [],
      'space.previous': [],
    },
  },
  {
    id: 'arc',
    name: 'Arc',
    description: 'Arc-style shortcuts: Mod+1..5 switch spaces, not tabs.',
    overrides: {
      'tab.reopen-closed': ['Mod+Shift+T'],
      'space.switch': ['Mod+1', 'Mod+2', 'Mod+3', 'Mod+4', 'Mod+5'],
      'tab.go-to': [],
      'nav.back': ['Mod['],
      'nav.forward': ['Mod]'],
      'nav.reload': ['Mod+R'],
      'focus-address': ['Mod+L'],
      'new-tab': ['Mod+T'],
      'tab.close': ['Mod+W'],
    },
  },
];

/** Lookup a preset by id. */
export function getPreset(id: string): KeymapPreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

/** All presets, in display order. */
export function listPresets(): readonly KeymapPreset[] {
  return PRESETS;
}

/** The overrides that applying a given preset would write to the store. */
export function presetOverrides(presetId: string): Record<string, string[]> | null {
  const preset = getPreset(presetId);
  if (!preset) return null;
  return { ...preset.overrides };
}

/** The id of the built-in preset that matches no customization: "default". */
export const DEFAULT_PRESET_ID = 'default';
