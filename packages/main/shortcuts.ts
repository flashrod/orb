import { COMMANDS, matchBinding } from '../shared/commands';
import type { MatchedShortcut, OrbShortcutAction } from '../shared/events';

export interface ShortcutInput {
  type: string;
  key: string;
  meta?: boolean;
  control?: boolean;
  shift?: boolean;
  alt?: boolean;
  isAutoRepeat?: boolean;
  isComposing?: boolean;
}

function toMatchInput(input: ShortcutInput) {
  return {
    key: input.key.toLowerCase(),
    ctrl: !!input.control,
    alt: !!input.alt,
    shift: !!input.shift,
    meta: !!input.meta,
  };
}

/** True if the binding uses a command modifier (Ctrl, Alt, Mod). */
export function bindingUsesModifier(binding: string): boolean {
  const parts = binding.split('+').map((p) => p.trim().toLowerCase());
  return parts.some((p) => p === 'ctrl' || p === 'alt' || p === 'mod');
}

/** True if the binding is safe to trigger inside a text field:
 *  a command modifier (Ctrl, Alt, Mod), or Escape, or a function key (F1–F12).
 *  Shift alone does not count — it would steal typing. */
export function bindingSafeInTextField(binding: string): boolean {
  const parts = binding.split('+').map((p) => p.trim().toLowerCase());
  if (parts.some((p) => p === 'ctrl' || p === 'alt' || p === 'mod')) return true;
  const key = parts[parts.length - 1] ?? '';
  if (key === 'escape') return true;
  return /^f([1-9]|1[0-2])$/.test(key);
}

/** Module-level overrides synced from the renderer preferences store.
 *  The main process keeps its own copy so key events inside web pages
 *  (forwarded via before-input-event) can be matched without a round trip. */
export let keymapOverrides: Record<string, string[] | null | undefined> = {};

/** Replace the entire override map (used on initial sync). */
export function setKeymapOverrides(overrides: Record<string, string[] | null | undefined>): void {
  keymapOverrides = { ...overrides };
}

/** Override a single command's bindings (null = unbind). */
export function setKeymapOverride(commandId: string, bindings: string[] | null): void {
  keymapOverrides = { ...keymapOverrides, [commandId]: bindings };
}

/** Maps a key event to the shell action it should trigger, if any.
 *
 * The mapping is driven by the shared command registry so the menu, the
 * forwarder and the renderer all agree on what each key combination does.
 *
 * On macOS, `Mod` maps to the Meta (Cmd) modifier. For backward
 * compatibility with the previous behavior where `meta || control` both
 * counted as the command modifier, we also try with ctrl/meta swapped when
 * the first match attempt fails.
 *
 * Guards:
 * - key repeats and IME composition are ignored
 * - when `inTextField` is true, only bindings that use a modifier, or are
 *   Escape or a function key, are matched (so typing in a page is never stolen)
 */
export function shortcutForInput(
  input: ShortcutInput,
  overrides: Record<string, string[] | null | undefined> = keymapOverrides,
  inTextField = false,
): MatchedShortcut | null {
  if (input.type !== 'keyDown' || input.isAutoRepeat || input.isComposing) return null;

  const platform = (process.platform as 'darwin' | 'win32' | 'linux') ?? 'darwin';

  const tryMatch = (candidate: ShortcutInput): MatchedShortcut | null => {
    const result = matchBinding(toMatchInput(candidate), platform, COMMANDS, overrides);
    if (!result) return null;
    if (inTextField) {
      // Find the matched binding to check the text-field guard.
      const command = COMMANDS.find((c) => c.id === result.commandId);
      if (!command) return null;
      const stored = overrides[command.id];
      const bindings = stored === undefined ? command.defaultBindings : stored ?? [];
      if (bindings.some((b) => bindingSafeInTextField(b))) return { action: result.commandId as OrbShortcutAction, params: result.params };
      return null;
    }
    return { action: result.commandId as OrbShortcutAction, params: result.params };
  };

  const result = tryMatch(input);
  if (result) return result;

  // Fallback: swap ctrl and meta so that, e.g., Ctrl+L on macOS still
  // matches the Mod+L binding (old behavior treated meta||control as one).
  return tryMatch({ ...input, control: input.meta, meta: input.control });
}
