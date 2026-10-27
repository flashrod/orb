import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface TabContextMenuProps {
  x: number;
  y: number;
  title: string;
  isPinned: boolean;
  canUnload: boolean;
  canSplit: boolean;
  canCloseToRight: boolean;
  isMuted?: boolean;
  isSiteMuted?: boolean;
  onNewTab: () => void;
  onNewGroup: () => void;
  onSplitView: () => void;
  onTogglePinned: () => void;
  onToggleMute?: () => void;
  onToggleSiteMute?: () => void;
  onUnload: () => void;
  onCloseTab: () => void;
  onCloseToRight: () => void;
  onDismiss: () => void;
}

/**
 * Text-only tab menu. Keep it short: pin, unload, close, close to the right.
 * Icons made the list noisy and the old menu grew one action per feature.
 */
export default function TabContextMenu(props: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const left = Math.max(8, Math.min(props.x, window.innerWidth - 250));
  const top = Math.max(8, Math.min(props.y, window.innerHeight - 220));

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

  const action = (label: string, onClick: () => void, disabled = false) => (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => { onClick(); props.onDismiss(); }}
      className="orb-control flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="truncate">{label}</span>
    </button>
  );

  return createPortal(<div ref={menuRef} role="menu" aria-label={`Actions for ${props.title}`} style={{ left, top, backgroundColor: 'var(--orb-elevated)' }} className="fixed z-[10000] w-[220px] rounded-lg border orb-border p-1.5 shadow-[0_12px_32px_rgba(41,37,36,0.2)]">
    {action('New tab to the right', props.onNewTab)}
    {action('Add to new tab group', props.onNewGroup)}
    {action('Open in split view', props.onSplitView, !props.canSplit)}
    {props.onToggleMute && action(props.isMuted ? 'Unmute tab' : 'Mute tab', props.onToggleMute)}
    {props.onToggleSiteMute && action(props.isSiteMuted ? 'Unmute site' : 'Mute site', props.onToggleSiteMute)}
    <div className="my-1 border-t orb-border" />
    {action(props.isPinned ? 'Unpin tab' : 'Pin tab', props.onTogglePinned)}
    {action('Unload tab', props.onUnload, !props.canUnload)}
    <div className="my-1 border-t orb-border" />
    {action('Close tab', props.onCloseTab)}
    {action('Close tabs to the right', props.onCloseToRight, !props.canCloseToRight)}
  </div>, document.body);
}
