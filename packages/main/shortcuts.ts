import { COMMANDS, matchBinding } from '../shared/commands';
import type { OrbShortcutAction } from '../shared/events';

export interface ShortcutInput {
  type: string;
  key: string;
  meta?: boolean;
  control?: boolean;
  shift?: boolean;
  alt?: boolean;
  isAutoRepeat?: boolean;
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

/** Maps a key event to the shell action it should trigger, if any.
 *
 * The mapping is driven by the shared command registry so the menu, the
 * forwarder and the renderer all agree on what each key combination does.
 *
 * On macOS, `Mod` maps to the Meta (Cmd) modifier. For backward
 * compatibility with the previous behavior where `meta || control` both
 * counted as the command modifier, we also try with ctrl/meta swapped when
 * the first match attempt fails.
 */
export function shortcutForInput(input: ShortcutInput): OrbShortcutAction | null {
  if (input.type !== 'keyDown' || input.isAutoRepeat) return null;

  const platform = (process.platform as 'darwin' | 'win32' | 'linux') ?? 'darwin';

  const result = matchBinding(toMatchInput(input), platform, COMMANDS, {});
  if (result) return result as OrbShortcutAction;

  // Fallback: swap ctrl and meta so that, e.g., Ctrl+L on macOS still
  // matches the Mod+L binding (old behavior treated meta||control as one).
  const swapped = { ...input, control: input.meta, meta: input.control };
  return matchBinding(toMatchInput(swapped), platform, COMMANDS, {}) as OrbShortcutAction | null;
}
