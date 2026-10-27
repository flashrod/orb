import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderSimple, X } from '@phosphor-icons/react';
import { GROUP_COLORS } from '../lib/groupColors';

/**
 * Chrome-style group creation: name first, then pick a colour. Tabs that join
 * the group share the colour in the tab strip and the sidebar.
 */
export default function GroupCreateDialog({
  suggestedName,
  initialColor,
  onConfirm,
  onClose,
}: {
  suggestedName: string;
  initialColor: string;
  onConfirm: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(suggestedName);
  const [color, setColor] = useState(initialColor);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm(name.trim() || suggestedName, color);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-start justify-center bg-stone-950/20 px-6 pt-[18vh] backdrop-blur-[2px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-create-title"
        onSubmit={submit}
        className="orb-elevated orb-strong w-full max-w-[380px] overflow-hidden rounded-xl border orb-border shadow-[0_24px_60px_rgba(41,37,36,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b orb-border px-3 py-2.5">
          <FolderSimple aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color }} />
          <p id="group-create-title" className="min-w-0 flex-1 text-xs font-semibold">New tab group</p>
          <button type="button" aria-label="Cancel new tab group" onClick={onClose} className="orb-control flex h-6 w-6 items-center justify-center rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-3 px-3 py-3">
          <label className="block">
            <span className="orb-muted mb-1 block text-[10px] font-medium uppercase tracking-[0.12em]">Name</span>
            <input
              autoFocus
              value={name}
              maxLength={32}
              onChange={(event) => setName(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Tab group name"
              className="orb-strong h-9 w-full rounded-md border orb-border bg-transparent px-2.5 text-xs outline-none focus:border-[var(--orb-accent)]"
            />
          </label>

          <div>
            <span className="orb-muted mb-1.5 block text-[10px] font-medium uppercase tracking-[0.12em]">Colour</span>
            <div role="radiogroup" aria-label="Tab group colour" className="flex flex-wrap gap-1.5">
              {GROUP_COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={color === option.value}
                  aria-label={option.name}
                  title={option.name}
                  onClick={() => setColor(option.value)}
                  className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: option.value, boxShadow: color === option.value ? `0 0 0 2px ${option.value}` : undefined }}
                >
                  {color === option.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t orb-border px-3 py-2.5">
          <button type="button" onClick={onClose} className="orb-control rounded-md px-3 py-1.5 text-xs">Cancel</button>
          <button type="submit" className="orb-accent-bg rounded-md px-3 py-1.5 text-xs font-medium text-white">Create group</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
