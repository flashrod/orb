import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBendDownRight, Copy, PushPin, Plus, ArrowClockwise, X, Columns } from '@phosphor-icons/react';

export interface TabContextMenuProps {
  x: number;
  y: number;
  title: string;
  isPinned: boolean;
  canReload: boolean;
  canSplit: boolean;
  canCloseOthers: boolean;
  canCloseToRight: boolean;
  onNewTab: () => void;
  onReload: () => void;
  onSplitView: () => void;
  onDuplicate: () => void;
  onTogglePinned: () => void;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onDismiss: () => void;
}

export default function TabContextMenu(props: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const left = Math.max(8, Math.min(props.x, window.innerWidth - 250));
  const top = Math.max(8, Math.min(props.y, window.innerHeight - 330));

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) props.onDismiss();
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onDismiss();
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [props.onDismiss]);

  const action = (label: string, Icon: React.ComponentType<{ className?: string }>, onClick: () => void, disabled = false) => (
    <button type="button" role="menuitem" disabled={disabled} onClick={() => { onClick(); props.onDismiss(); }} className="orb-control flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40">
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );

  return createPortal(<div ref={menuRef} role="menu" aria-label={`Actions for ${props.title}`} style={{ left, top, backgroundColor: 'var(--orb-elevated)' }} className="fixed z-[10000] w-[238px] rounded-lg border orb-border p-1.5 shadow-[0_12px_32px_rgba(41,37,36,0.2)]">
    {action('New tab to the right', ArrowBendDownRight, props.onNewTab)}
    {action('Open in split view', Columns, props.onSplitView, !props.canSplit)}
    {action('Duplicate', Copy, props.onDuplicate)}
    {action('Reload', ArrowClockwise, props.onReload, !props.canReload)}
    <div className="my-1 border-t orb-border" />
    {action(props.isPinned ? 'Unpin tab' : 'Pin tab', PushPin, props.onTogglePinned)}
    {action('Close tab', X, props.onCloseTab)}
    {action('Close other tabs', X, props.onCloseOthers, !props.canCloseOthers)}
    {action('Close tabs to the right', X, props.onCloseToRight, !props.canCloseToRight)}
  </div>, document.body);
}
