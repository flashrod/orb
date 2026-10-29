import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash, X } from '@phosphor-icons/react';

/**
 * Simple confirm dialog for destructive actions (delete bookmark/folder).
 * Enter = confirm, Escape = cancel.
 */
export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') onConfirm();
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onConfirm, onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-start justify-center bg-stone-950/20 px-6 pt-[18vh] backdrop-blur-[2px]"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="orb-elevated orb-strong w-full max-w-[380px] overflow-hidden rounded-xl border orb-border shadow-[0_24px_60px_rgba(41,37,36,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b orb-border px-3 py-2.5">
          <Trash aria-hidden="true" className="h-4 w-4 shrink-0 text-red-600" />
          <p id="confirm-title" className="min-w-0 flex-1 text-xs font-semibold">{title}</p>
          <button type="button" aria-label="Cancel" onClick={onCancel} className="orb-control flex h-6 w-6 items-center justify-center rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-3 py-3">
          <p className="text-xs text-muted">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t orb-border px-3 py-2.5">
          <button type="button" onClick={onCancel} className="orb-control rounded-md px-3 py-1.5 text-xs">Cancel</button>
          <button type="button" onClick={onConfirm} className="orb-accent-bg rounded-md px-3 py-1.5 text-xs font-medium text-white">Delete</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
