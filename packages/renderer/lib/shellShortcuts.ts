import { COMMANDS, bindingSafeInTextField, matchBinding, type Platform } from '../../shared/commands';
import type { MatchedShortcut, OrbShortcutAction } from '../../shared/events';

/** Structural subset of KeyboardEvent so this can be unit-tested in Node. */
export interface KeyboardLike {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
}

export function detectPlatform(userAgent?: string): Platform {
  const ua = userAgent ?? (typeof navigator === 'undefined' ? '' : navigator.userAgent);
  if (/Mac|iPhone|iPad/i.test(ua)) return 'darwin';
  if (/Windows/i.test(ua)) return 'win32';
  return 'linux';
}

/**
 * Map a shell (renderer) keydown event to a registry command.
 *
 * This is the shell-UI dispatch path: it runs when focus is in the React app
 * (address bar, command bar, settings, or the window itself). Page focus is
 * handled in the main process via `before-input-event`. Both paths share the
 * same command registry and overrides, so the keymap cannot drift.
 *
 * Guards mirror `shortcutForInput` in the main process:
 * - key repeats and IME composition are ignored
 * - in a text field only modifier/Escape/function-key bindings match, so
 *   typing is never stolen
 * - Ctrl and Meta are swapped as a fallback for legacy Ctrl+L-style presses
 */
export function shortcutForKeyboardEvent(
  event: KeyboardLike,
  overrides: Record<string, string[] | null | undefined> = {},
  options: { inTextField?: boolean; platform?: Platform } = {},
): MatchedShortcut | null {
  if (event.repeat || event.isComposing) return null;
  if (!event.key) return null;

  const platform = options.platform ?? detectPlatform();

  const tryMatch = (candidate: KeyboardLike): MatchedShortcut | null => {
    if (!candidate.key) return null;
    const result = matchBinding(
      {
        key: candidate.key.toLowerCase(),
        ctrl: !!candidate.ctrlKey,
        alt: !!candidate.altKey,
        shift: !!candidate.shiftKey,
        meta: !!candidate.metaKey,
      },
      platform,
      COMMANDS,
      overrides,
    );
    if (!result) return null;

    if (options.inTextField) {
      const command = COMMANDS.find((item) => item.id === result.commandId);
      if (!command) return null;
      const stored = overrides[command.id];
      const bindings = stored === undefined ? command.defaultBindings : stored ?? [];
      if (!bindings.some((binding) => bindingSafeInTextField(binding))) return null;
    }

    return { action: result.commandId as OrbShortcutAction, params: result.params };
  };

  // Build the swapped-modifiers candidate explicitly instead of spreading the
  // real KeyboardEvent: spreading only copies own enumerable properties, so a
  // DOM KeyboardEvent can lose `key` and crash inside tryMatch's toLowerCase().
  return tryMatch(event) ?? tryMatch({
    key: event.key,
    ctrlKey: event.metaKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.ctrlKey,
    repeat: event.repeat,
    isComposing: event.isComposing,
  });
}
