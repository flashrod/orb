import type { OrbShortcutAction } from '../shared/events';

export interface ShortcutInput {
  type: string;
  key: string;
  meta?: boolean;
  control?: boolean;
  shift?: boolean;
  isAutoRepeat?: boolean;
}

/** Maps a key event to the shell action it should trigger, if any. */
export function shortcutForInput(input: ShortcutInput): OrbShortcutAction | null {
  if (input.type !== 'keyDown' || input.isAutoRepeat) return null;

  const key = input.key.toLowerCase();
  const command = input.meta || input.control;

  if (command && input.shift && key === 't') return 'new-space';
  if (command && input.shift && key === 'm') return 'toggle-compact';
  if (command && !input.shift && key === 't') return 'new-tab';
  if (command && !input.shift && key === 'k') return 'command-bar';
  if (command && !input.shift && key === 'l') return 'focus-address';
  if (command && !input.shift && key === 'f') return 'find';
  if (command && !input.shift && key === 'p') return 'print';
  if (!command && !input.shift && key === 'escape') return 'close-overlays';
  return null;
}
