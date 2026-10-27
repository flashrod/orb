import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowCounterClockwise, Check, Code, DotsSixVertical, MagnifyingGlass, SlidersHorizontal, X } from '@phosphor-icons/react';
import { COMMANDS, bindingToAccelerator, commandsByCategory, effectiveKeymap, findCommand, findConflicts, parseBinding } from '../../shared/commands';
import { useBrowserPreferencesStore } from '../stores/preferences';

function formatKey(key: string): string {
  const k = key.toLowerCase();
  if (k === 'escape') return 'Esc';
  if (k === 'space') return 'Space';
  if (k === 'enter') return 'Enter';
  if (k === 'tab') return 'Tab';
  if (k === 'backspace') return '⌫';
  if (k === 'delete') return '⌦';
  if (/^f([1-9]|1[0-2])$/.test(k)) return k.toUpperCase();
  if (k.length === 1) return k.toUpperCase();
  return key;
}

function formatBinding(binding: string): string {
  const parts = binding.split('+').map((p) => p.trim().toLowerCase());
  const mods: string[] = [];
  let key = '';
  for (const p of parts) {
    if (p === 'ctrl') mods.push('^');
    else if (p === 'alt') mods.push('⌥');
    else if (p === 'shift') mods.push('⇧');
    else if (p === 'mod') mods.push('⌘');
    else key = p;
  }
  return [...mods, formatKey(key)].join('');
}

function formatBindings(bindings: string[]): string {
  return bindings.map(formatBinding).join(' · ');
}

function normalizeUserInput(key: string, ctrl: boolean, alt: boolean, shift: boolean, meta: boolean): string | null {
  const k = key.toLowerCase();
  if (!k || k === 'unknown') return null;
  if (k === 'control' || k === 'alt' || k === 'shift' || k === 'meta' || k === 'capslock' || k === 'fn') return null;
  const mods: string[] = [];
  if (ctrl) mods.push('ctrl');
  if (alt) mods.push('alt');
  if (shift) mods.push('shift');
  if (meta) mods.push('mod');
  return [...mods, k].join('+');
}

/** Find a command (other than ignoreId) that already uses this binding. */
function findCommandWithBinding(
  binding: string,
  ignoreId: string,
  keymap: Map<string, string[]>,
  allCommands: (typeof COMMANDS)[number][],
): (typeof COMMANDS)[number] | undefined {
  const parsed = parseBinding(binding);
  if (!parsed) return undefined;
  return allCommands.find((c) => {
    if (c.id === ignoreId) return false;
    const bindings = keymap.get(c.id);
    return bindings?.some((b) => {
      const p = parseBinding(b);
      return !!p && p.ctrl === parsed.ctrl && p.alt === parsed.alt && p.shift === parsed.shift && p.mod === parsed.mod && p.key.toLowerCase() === parsed.key.toLowerCase();
    });
  });
}

export default function ShortcutsSettings() {
  const { keymapOverrides, setKeymapOverride, resetKeymap } = useBrowserPreferencesStore(
    (state) => ({ keymapOverrides: state.keymapOverrides, setKeymapOverride: state.setKeymapOverride, resetKeymap: state.resetKeymap }),
  );

  const [filter, setFilter] = useState('');
  const [recordingCommand, setRecordingCommand] = useState<string | null>(null);
  const [recordingRaw, setRecordingRaw] = useState('');
  const [conflict, setConflict] = useState<{ commandId: string; binding: string; existing: string[] } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const commandsByCat = useMemo(() => commandsByCategory(), []);
  const keymap = useMemo(() => effectiveKeymap(COMMANDS, keymapOverrides), [keymapOverrides]);

  const allCommands = useMemo(() => {
    const list: (typeof COMMANDS)[number][] = [];
    for (const cat of Object.values(commandsByCat)) list.push(...cat);
    return list;
  }, [commandsByCat]);

  const visibleCommands = useMemo(() => {
    const text = filter.trim().toLowerCase();
    if (!text) return allCommands;
    return allCommands.filter((c) =>
      c.title.toLowerCase().includes(text) ||
      c.id.toLowerCase().includes(text) ||
      (Array.from(keymap.get(c.id) ?? []).some((b) => b.toLowerCase().includes(text))));
  }, [allCommands, filter, keymap]);

  const clearMessages = useCallback(() => { setNotice(''); setError(''); }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!recordingCommand) return;
    event.preventDefault();

    const binding = normalizeUserInput(event.key, event.ctrlKey, event.altKey, event.shiftKey, event.metaKey);
    if (!binding) return;

    setRecordingRaw(binding);

    const existing = findCommandWithBinding(binding, recordingCommand, keymap, allCommands);
    if (existing) {
      setConflict({ commandId: recordingCommand, binding, existing: keymap.get(existing.id) ?? [] });
      return;
    }

    setKeymapOverride(recordingCommand, [binding]);
    setRecordingCommand(null);
    setRecordingRaw('');
    setConflict(null);
    setNotice(`Bound "${formatBinding(binding)}" to ${findCommand(recordingCommand)?.title}.`);
    clearMessages();
  }, [recordingCommand, keymap, allCommands, setKeymapOverride, findCommand, clearMessages]);

  useEffect(() => {
    if (!recordingCommand) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingCommand, handleKeyDown]);

  const applyConflictChoice = useCallback((choice: 'replace' | 'swap' | 'cancel') => {
    if (!conflict || !recordingCommand) return;
    const { commandId, binding } = conflict;
    const parsed = parseBinding(binding);
    if (!parsed) return;

    if (choice === 'replace') {
      // New command keeps the new binding; old command loses it
      const oldCmd = findCommandWithBinding(binding, commandId, keymap, allCommands);
      if (oldCmd) {
        setKeymapOverride(oldCmd.id, keymap.get(oldCmd.id)?.filter((b) => {
          const p = parseBinding(b);
          return !(!p || p.ctrl === parsed.ctrl && p.alt === parsed.alt && p.shift === parsed.shift && p.mod === parsed.mod && p.key.toLowerCase() === parsed.key.toLowerCase());
        }) ?? []);
      }
      setKeymapOverride(commandId, [binding]);
    } else if (choice === 'swap') {
      // Swap: old command loses binding, new command gets it
      const oldCmd = findCommandWithBinding(binding, commandId, keymap, allCommands);
      if (oldCmd) {
        setKeymapOverride(oldCmd.id, keymap.get(oldCmd.id)?.filter((b) => b !== binding) ?? []);
      }
      setKeymapOverride(commandId, [binding]);
    } else {
      setConflict(null);
      setRecordingCommand(null);
      setRecordingRaw('');
      return;
    }

    setRecordingCommand(null);
    setRecordingRaw('');
    setConflict(null);
    setNotice(`Bound "${formatBinding(binding)}" to ${findCommand(commandId)?.title}.`);
    clearMessages();
  }, [conflict, recordingCommand, keymap, allCommands, setKeymapOverride, findCommand, clearMessages]);

  const clearCommand = useCallback((commandId: string) => {
    setKeymapOverride(commandId, null);
    setNotice(`Unbound ${findCommand(commandId)?.title}.`);
    clearMessages();
  }, [setKeymapOverride, findCommand, clearMessages]);

  const clearCategory = useCallback((category: string) => {
    for (const command of commandsByCat[category as keyof typeof commandsByCat]) {
      setKeymapOverride(command.id, null);
    }
    setNotice(`Cleared all shortcuts in ${category}.`);
    clearMessages();
  }, [commandsByCat, setKeymapOverride, clearMessages]);

  const resetAll = useCallback(() => {
    resetKeymap();
    setNotice('All shortcuts reset to defaults.');
    clearMessages();
  }, [resetKeymap, clearMessages]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid keymap file.');
      const overrides: Record<string, string[] | null> = {};
      let valid = 0;
      for (const [id, value] of Object.entries(data)) {
        if (!findCommand(id)) continue;
        if (value === null) { overrides[id] = null; valid++; continue; }
        if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
          overrides[id] = value;
          valid++;
        }
      }
      for (const [id, bindings] of Object.entries(overrides)) {
        setKeymapOverride(id, bindings);
      }
      setNotice(`Imported ${valid} shortcut override${valid !== 1 ? 's' : ''}.`);
      event.target.value = '';
    } catch {
      setError('Failed to import keymap. Make sure it is a valid JSON file.');
    }
  }, [setKeymapOverride, findCommand]);

  const handleExport = useCallback(() => {
    const data: Record<string, string[] | null> = {};
    for (const [id, bindings] of keymap) {
      if (bindings.length > 0) data[id] = bindings;
    }
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orb-keymap.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotice('Keymap exported to orb-keymap.json.');
  }, [keymap]);

  const isConflictActive = conflict?.commandId === recordingCommand;

  return <div className="mx-auto max-w-[720px] space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="orb-strong text-sm font-semibold">Shortcuts</h2>
        <p className="orb-muted mt-1 text-xs">View, change, and remove keyboard shortcuts. Click a binding to record a new one. Shortcuts work in web pages and in Orb’s own UI.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={handleExport} className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs">
          <Code className="h-3.5 w-3.5" />Export
        </button>
        <label className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs">
          Import
          <input type="file" accept=".json" className="sr-only" onChange={handleImport} />
        </label>
        <button type="button" onClick={resetAll} className="orb-control flex items-center gap-1.5 rounded-md border orb-border px-3 py-2 text-xs">
          <ArrowCounterClockwise className="h-3.5 w-3.5" />Reset all
        </button>
      </div>
    </div>

    {error && <p role="alert" className="rounded-md bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-md border border-accent-soft/50 bg-accent-soft/20 px-3 py-2 text-xs text-accent">{notice}</p>}

    <div className="relative">
      <MagnifyingGlass aria-hidden="true" className="orb-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <input
        type="search"
        aria-label="Filter shortcuts"
        placeholder="Filter by command or binding"
        value={filter}
        onChange={(event) => { setFilter(event.target.value); clearMessages(); }}
        className="orb-control h-9 w-full rounded-md border orb-border bg-transparent pl-9 pr-3 text-xs outline-none"
      />
    </div>

    {recordingCommand && (
      <div className="orb-elevated rounded-lg border orb-border p-3">
        <p className="orb-strong text-xs">Recording shortcut for <span className="orb-accent">{findCommand(recordingCommand)?.title}</span></p>
        <p className="orb-muted text-[10px] mt-1">Press the key combination you want. {recordingRaw ? `Current: ${formatBinding(recordingRaw)}` : ''}</p>
        <p className="orb-muted text-[10px] mt-1">Press <span className="orb-strong">Esc</span> to cancel, <span className="orb-strong">⌫</span> to clear.</p>
        {isConflictActive && conflict && (
          <div className="mt-2 p-2 rounded-md border border-accent bg-accent/10">
            <p className="orb-accent text-xs font-medium">Conflict: “{formatBinding(conflict.binding)}” is already used by another command</p>
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => applyConflictChoice('replace')} className="orb-control flex items-center gap-1 rounded-md border orb-border px-2.5 py-1 text-xs">Replace</button>
              <button type="button" onClick={() => applyConflictChoice('swap')} className="orb-control flex items-center gap-1 rounded-md border orb-border px-2.5 py-1 text-xs">Swap</button>
              <button type="button" onClick={() => applyConflictChoice('cancel')} className="orb-control flex items-center gap-1 rounded-md border orb-border px-2.5 py-1 text-xs">Cancel</button>
            </div>
          </div>
        )}
      </div>
    )}

    {visibleCommands.length === 0 ? (
      <div className="orb-elevated orb-muted rounded-lg border orb-border px-4 py-6 text-center text-xs">
        {allCommands.length === 0 ? 'No commands.' : 'No commands match that filter.'}
      </div>
    ) : (
      <div className="space-y-1">
        {Object.entries(commandsByCat).map(([category, commands]) => {
          const catCommands = commands.filter((c) => visibleCommands.includes(c));
          if (catCommands.length === 0) return null;
          return <div key={category} className="mt-4">
            <h3 className="orb-strong text-[10px] uppercase tracking-wider orb-muted px-3">{category}</h3>
            <div className="space-y-0.5">
              {catCommands.map((command) => {
                const bindings = keymap.get(command.id) ?? [];
                const hasConflict = findConflicts(COMMANDS, keymapOverrides).some((c) => c.commands.includes(command.id));
                return (
                  <div
                    key={command.id}
                    className="orb-elevated flex items-center gap-3 rounded-md border orb-border px-3 py-2 cursor-pointer hover:bg-accent-soft/50"
                    onClick={() => {
                      if (recordingCommand === command.id) {
                        setRecordingCommand(null);
                        setRecordingRaw('');
                        setConflict(null);
                      } else {
                        setRecordingCommand(command.id);
                        setRecordingRaw('');
                        setConflict(null);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setRecordingCommand(command.id);
                        setRecordingRaw('');
                        setConflict(null);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={recordingCommand === command.id ? 'Recording shortcut, press keys' : `Edit shortcut for ${command.title}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="orb-strong truncate text-xs">{command.title}</p>
                      <p className="orb-muted truncate text-[10px]">{command.id}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {bindings.length > 0 ? (
                        <span className="orb-strong text-[10px] bg-accent-soft/30 rounded px-1.5 py-0.5">{formatBindings(bindings)}</span>
                      ) : (
                        <span className="orb-muted text-[10px] italic">unbound</span>
                      )}
                      <button
                        type="button"
                        aria-label={`Clear shortcut for ${command.title}`}
                        onClick={(event) => { event.stopPropagation(); clearCommand(command.id); }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {hasConflict && (
                      <p className="orb-accent text-[10px] mt-0.5">⚠ Conflicts with another command</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>;
        })}
      </div>
    )}

    {notice && <p role="status" className="orb-accent-soft orb-strong rounded-md px-3 py-2 text-xs">{notice}</p>}
  </div>;
}
