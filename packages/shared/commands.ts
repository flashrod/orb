/**
 * Single source of truth for Orb's keyboard commands.
 *
 * Every command is declared here once. The menu (main/menu.ts), the key-event
 * forwarder (main/shortcuts.ts), the renderer (App.tsx) and the command bar
 * all read from this registry. Keymap overrides live in the preferences store
 * and are merged on top of these defaults.
 *
 * This module deliberately imports nothing from Electron or the DOM so it can
 * be unit-tested in any environment.
 */

export type CommandCategory =
  | 'Tabs'
  | 'Navigation'
  | 'Spaces'
  | 'View'
  | 'Split and Glance'
  | 'Tools'
  | 'Privacy'
  | 'App';

export interface Command {
  /** Stable identifier, e.g. 'tab.new'. Changing this breaks stored overrides. */
  id: string;
  /** Human-readable name shown in settings and tooltips. */
  title: string;
  category: CommandCategory;
  /** Default bindings, e.g. ['Mod+T']. Empty means unbound by default. */
  defaultBindings: string[];
  /** Where the command can run. */
  scope: 'shell' | 'page' | 'both';
  /** Optional parameters for parameterized commands (future phases). */
  params?: Record<string, 'string' | 'number'>;
}

export type Platform = 'darwin' | 'win32' | 'linux';

/**
 * A parsed keyboard binding. Modifiers are always stored in the order
 * ctrl, alt, shift, mod regardless of how they were written.
 */
interface ParsedBinding {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  mod: boolean;
  key: string; // lowercase letter/digit or special key name
}

const MODIFIER_NAMES = new Set(['ctrl', 'alt', 'shift', 'mod']);

/**
 * Parse a binding string like 'Mod+Shift+T' or 'Ctrl+Alt+KeyT'.
 * Returns null for malformed bindings.
 */
export function parseBinding(binding: string): ParsedBinding | null {
  const parts = binding.split('+').map((p) => p.trim().toLowerCase());
  if (parts.length === 0) return null;

  let ctrl = false;
  let alt = false;
  let shift = false;
  let mod = false;
  let key = '';

  for (const part of parts) {
    if (part === 'ctrl') ctrl = true;
    else if (part === 'alt') alt = true;
    else if (part === 'shift') shift = true;
    else if (part === 'mod') mod = true;
    else if (part === '') continue;
    else if (key === '') key = part;
    else return null; // more than one non-modifier part
  }

  if (!key) return null;
  return { ctrl, alt, shift, mod, key };
}

/**
 * Normalize a parsed binding against the platform: 'Mod' maps to the Meta
 * (Cmd) modifier on macOS and to Control elsewhere.
 */
export function normalizeBinding(
  parsed: ParsedBinding,
  platform: Platform,
): { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; key: string } {
  const useMeta = platform === 'darwin';
  return {
    ctrl: useMeta ? parsed.ctrl : parsed.ctrl || parsed.mod,
    alt: parsed.alt,
    shift: parsed.shift,
    meta: useMeta ? parsed.mod : false,
    key: parsed.key,
  };
}

/**
 * Match a key event against a single normalized binding.
 * Ignores key repeats (handled by caller) and modifier-only presses (no key).
 */
function matchesBinding(
  input: { key: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean },
  binding: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; key: string },
): boolean {
  if (input.key.toLowerCase() !== binding.key.toLowerCase()) return false;
  return (
    input.ctrl === binding.ctrl &&
    input.alt === binding.alt &&
    input.shift === binding.shift &&
    input.meta === binding.meta
  );
}

/**
 * Find the command that matches a key event, given the effective keymap.
 *
 * For commands with `params`, the parameter value is extracted from the
 * binding's key part (e.g. binding `Mod+3` on a command with
 * `params: { index: 'number' }` yields `{ index: 3 }`).
 *
 * @param input - Normalized key event (key already lowercased by caller).
 * @param platform - 'darwin' | 'win32' | 'linux'.
 * @param commands - The command registry.
 * @param overrides - Stored keymap overrides: commandId → bindings or null (unbound).
 * @returns The matching command id plus extracted params, or null.
 */
export interface MatchedBinding {
  commandId: string;
  params: Record<string, string | number>;
}

export function matchBinding(
  input: { key: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean },
  platform: Platform,
  commands: readonly Command[],
  overrides: Record<string, string[] | null | undefined>,
): MatchedBinding | null {
  // Modifier-only presses never match (no key to compare).
  if (!input.key) return null;

  for (const command of commands) {
    const stored = overrides[command.id];
    // null = explicitly unbound, undefined = not overridden → use defaults.
    const bindings = stored === undefined ? command.defaultBindings : stored;
    if (!bindings || bindings.length === 0) continue;

    for (const raw of bindings) {
      const parsed = parseBinding(raw);
      if (!parsed) continue;
      const normalized = normalizeBinding(parsed, platform);
      if (!matchesBinding(input, normalized)) continue;

      // Extract parameters from the binding's key part for parameterized commands.
      const params: Record<string, string | number> = {};
      if (command.params) {
        const paramNames = Object.keys(command.params);
        const keyValue = normalized.key;
        for (const paramName of paramNames) {
          const paramType = command.params[paramName];
          if (paramType === 'number') {
            const n = Number(keyValue);
            params[paramName] = Number.isFinite(n) ? n : keyValue;
          } else {
            params[paramName] = keyValue;
          }
        }
      }

      return { commandId: command.id, params };
    }
  }
  return null;
}

/** ------------------------------------------------------------------ */
/** Command registry                                                   */
/** ------------------------------------------------------------------ */

/** Every command Orb knows about. IDs are permanent — stored keymap
 *  overrides are keyed by them. Existing action names from
 *  OrbShortcutAction are preserved so the menu/renderer keep working. */
export const COMMANDS: readonly Command[] = [
  // Tabs
  {
    id: 'new-tab',
    title: 'New Tab',
    category: 'Tabs',
    defaultBindings: ['Mod+T'],
    scope: 'both',
  },
  {
    id: 'tab.close',
    title: 'Close Tab',
    category: 'Tabs',
    defaultBindings: ['Mod+W'],
    scope: 'both',
  },
  {
    id: 'tab.reopen-closed',
    title: 'Reopen Closed Tab',
    category: 'Tabs',
    defaultBindings: ['Mod+Shift+T'],
    scope: 'shell',
  },
  {
    id: 'tab.next',
    title: 'Next Tab',
    category: 'Tabs',
    defaultBindings: ['Ctrl+Tab'],
    scope: 'both',
  },
  {
    id: 'tab.previous',
    title: 'Previous Tab',
    category: 'Tabs',
    defaultBindings: ['Ctrl+Shift+Tab'],
    scope: 'both',
  },
  {
    id: 'tab.go-to',
    title: 'Go to Tab',
    category: 'Tabs',
    defaultBindings: ['Mod+1', 'Mod+2', 'Mod+3', 'Mod+4', 'Mod+5', 'Mod+6', 'Mod+7', 'Mod+8'],
    scope: 'both',
    params: { index: 'number' },
  },
  {
    id: 'tab.go-to-last',
    title: 'Go to Last Tab',
    category: 'Tabs',
    defaultBindings: ['Mod+9'],
    scope: 'both',
  },
  {
    id: 'tab.pin',
    title: 'Pin Tab',
    category: 'Tabs',
    defaultBindings: [],
    scope: 'both',
  },
  {
    id: 'tab.mute',
    title: 'Mute Tab',
    category: 'Tabs',
    defaultBindings: [],
    scope: 'both',
  },
  {
    id: 'tab.duplicate',
    title: 'Duplicate Tab',
    category: 'Tabs',
    defaultBindings: [],
    scope: 'both',
  },
  {
    id: 'tab.hibernate',
    title: 'Hibernate This Tab',
    category: 'Tabs',
    defaultBindings: [],
    scope: 'both',
  },
  {
    id: 'tab.hibernate-others',
    title: 'Hibernate Other Tabs',
    category: 'Tabs',
    defaultBindings: [],
    scope: 'both',
  },

  // Spaces
  {
    id: 'new-space',
    title: 'New Space',
    category: 'Spaces',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'space.switch',
    title: 'Switch to Space',
    category: 'Spaces',
    defaultBindings: ['Ctrl+1', 'Ctrl+2', 'Ctrl+3', 'Ctrl+4', 'Ctrl+5'],
    scope: 'shell',
    params: { index: 'number' },
  },
  {
    id: 'space.next',
    title: 'Next Space',
    category: 'Spaces',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'space.previous',
    title: 'Previous Space',
    category: 'Spaces',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'space.switch-profile',
    title: 'Switch Profile',
    category: 'Spaces',
    defaultBindings: [],
    scope: 'shell',
  },

  // Navigation
  {
    id: 'nav.back',
    title: 'Back',
    category: 'Navigation',
    defaultBindings: ['Mod['],
    scope: 'both',
  },
  {
    id: 'nav.forward',
    title: 'Forward',
    category: 'Navigation',
    defaultBindings: ['Mod]'],
    scope: 'both',
  },
  {
    id: 'nav.reload',
    title: 'Reload',
    category: 'Navigation',
    defaultBindings: ['Mod+R'],
    scope: 'both',
  },
  {
    id: 'nav.hard-reload',
    title: 'Hard Reload',
    category: 'Navigation',
    defaultBindings: ['Mod+Shift+R'],
    scope: 'both',
  },
  {
    id: 'focus-address',
    title: 'Focus Address Bar',
    category: 'Navigation',
    defaultBindings: ['Mod+L'],
    scope: 'shell',
  },
  {
    id: 'command-bar',
    title: 'Open Command Bar',
    category: 'Navigation',
    defaultBindings: ['Mod+K'],
    scope: 'shell',
  },
  {
    id: 'find',
    title: 'Find',
    category: 'Navigation',
    defaultBindings: ['Mod+F'],
    scope: 'both',
  },

  // View
  {
    id: 'view.zoom-in',
    title: 'Zoom In',
    category: 'View',
    defaultBindings: ['Mod+='],
    scope: 'both',
  },
  {
    id: 'view.zoom-out',
    title: 'Zoom Out',
    category: 'View',
    defaultBindings: ['Mod+-'],
    scope: 'both',
  },
  {
    id: 'view.zoom-reset',
    title: 'Reset Zoom',
    category: 'View',
    defaultBindings: ['Mod+0'],
    scope: 'both',
  },
  {
    id: 'toggle-compact',
    title: 'Toggle Compact',
    category: 'View',
    defaultBindings: ['Mod+Shift+M'],
    scope: 'shell',
  },
  {
    id: 'view.toggle-sidebar',
    title: 'Toggle Sidebar',
    category: 'View',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'toggle-fullscreen',
    title: 'Toggle Fullscreen',
    category: 'View',
    defaultBindings: ['Mod+Shift+F'],
    scope: 'shell',
  },

  // Split and Glance
  {
    id: 'split.open',
    title: 'Open Split View',
    category: 'Split and Glance',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'split.swap',
    title: 'Swap Panes',
    category: 'Split and Glance',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'split.close',
    title: 'Close Split View',
    category: 'Split and Glance',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'glance.open-link',
    title: 'Open Link in Glance',
    category: 'Split and Glance',
    defaultBindings: [],
    scope: 'both',
  },

  // Tools
  {
    id: 'settings',
    title: 'Settings',
    category: 'Tools',
    defaultBindings: ['Mod+,'],
    scope: 'shell',
  },
  {
    id: 'print',
    title: 'Print',
    category: 'Tools',
    defaultBindings: ['Mod+P'],
    scope: 'both',
  },
  {
    id: 'save-pdf',
    title: 'Save Page as PDF',
    category: 'Tools',
    defaultBindings: ['Mod+Shift+S'],
    scope: 'both',
  },
  {
    id: 'tools.devtools',
    title: 'Developer Tools',
    category: 'Tools',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'tools.element-picker',
    title: 'Element Picker',
    category: 'Tools',
    defaultBindings: [],
    scope: 'page',
  },
  {
    id: 'tools.copy-url',
    title: 'Copy URL',
    category: 'Tools',
    defaultBindings: [],
    scope: 'both',
  },
  {
    id: 'tools.downloads',
    title: 'Open Downloads',
    category: 'Tools',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'history',
    title: 'History',
    category: 'Tools',
    defaultBindings: ['Mod+Y'],
    scope: 'shell',
  },

  // Privacy
  {
    id: 'privacy.toggle-blocker',
    title: 'Toggle Blocker for This Site',
    category: 'Privacy',
    defaultBindings: [],
    scope: 'page',
  },
  {
    id: 'privacy.toggle-https-only',
    title: 'Toggle HTTPS-only for This Site',
    category: 'Privacy',
    defaultBindings: [],
    scope: 'page',
  },

  // App
  {
    id: 'show-welcome',
    title: 'Welcome to Orb',
    category: 'App',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'default-browser',
    title: 'Set Orb as Default Browser',
    category: 'App',
    defaultBindings: [],
    scope: 'shell',
  },
  {
    id: 'close-overlays',
    title: 'Close Overlays',
    category: 'App',
    defaultBindings: ['Escape'],
    scope: 'shell',
  },
  {
    id: 'toggle-pip',
    title: 'Picture in Picture',
    category: 'App',
    defaultBindings: [],
    scope: 'both',
  },
  {
    id: 'media-play-pause',
    title: 'Play/Pause Media',
    category: 'App',
    defaultBindings: [],
    scope: 'both',
  },
  {
    id: 'app.toggle-devtools',
    title: 'Toggle DevTools',
    category: 'App',
    defaultBindings: [],
    scope: 'shell',
  },
];

/** Lookup a command by id. */
export function findCommand(id: string): Command | undefined {
  return COMMANDS.find((c) => c.id === id);
}

/** All commands grouped by category. */
export function commandsByCategory(): Record<CommandCategory, Command[]> {
  const result: Record<CommandCategory, Command[]> = {
    Tabs: [],
    Navigation: [],
    Spaces: [],
    View: [],
    'Split and Glance': [],
    Tools: [],
    Privacy: [],
    App: [],
  };
  for (const command of COMMANDS) {
    (result[command.category] ??= []).push(command);
  }
  return result;
}

/**
 * Convert a registry binding string to an Electron accelerator string.
 * 'Mod' becomes 'CmdOrCtrl'. Other parts pass through unchanged.
 */
export function bindingToAccelerator(binding: string): string {
  return binding.replace(/\bmod\b/gi, 'CmdOrCtrl');
}

/**
 * Get the Electron accelerator for a command's first default binding,
 * or null if the command has no default binding.
 */
export function getCommandAccelerator(commandId: string): string | null {
  const command = findCommand(commandId);
  if (!command || command.defaultBindings.length === 0) return null;
  return bindingToAccelerator(command.defaultBindings[0]);
}

/**
 * Resolve the effective bindings for every command: defaults merged with
 * stored overrides. A null override unbinds the command; a missing override
 * falls back to defaults.
 */
export function effectiveKeymap(
  commands: readonly Command[],
  overrides: Record<string, string[] | null | undefined>,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const command of commands) {
    const stored = overrides[command.id];
    result.set(command.id, stored === undefined ? command.defaultBindings : stored ?? []);
  }
  return result;
}

/**
 * Find bindings that map to more than one command in the effective keymap.
 * Returns one entry per conflicting binding with the command ids that share it.
 */
export function findConflicts(
  commands: readonly Command[],
  overrides: Record<string, string[] | null | undefined>,
): { binding: string; commands: string[] }[] {
  const keymap = effectiveKeymap(commands, overrides);
  const bindingToCommands = new Map<string, string[]>();
  for (const [commandId, bindings] of keymap) {
    for (const binding of bindings) {
      const list = bindingToCommands.get(binding) ?? [];
      list.push(commandId);
      bindingToCommands.set(binding, list);
    }
  }
  const conflicts: { binding: string; commands: string[] }[] = [];
  for (const [binding, commandIds] of bindingToCommands) {
    if (commandIds.length > 1) conflicts.push({ binding, commands: commandIds });
  }
  return conflicts;
}

/**
 * Check whether a given command id is bound in the effective keymap.
 */
export function isBound(
  commandId: string,
  overrides: Record<string, string[] | null | undefined>,
  commands: readonly Command[] = COMMANDS,
): boolean {
  const command = findCommand(commandId);
  if (!command) return false;
  const stored = overrides[commandId];
  const bindings = stored === undefined ? command.defaultBindings : stored ?? [];
  return bindings.length > 0;
}
