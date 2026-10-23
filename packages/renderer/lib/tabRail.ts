export type TabLayoutMode = 'top' | 'split';

export interface TabRailPresentation {
  horizontalTabsVisible: boolean;
  railVisible: boolean;
  collapsedHandle: boolean;
  overlay: boolean;
}

export function getTabRailPresentation(
  layout: TabLayoutMode,
  compact: boolean,
  keyboardRevealed: boolean,
  hovered: boolean,
): TabRailPresentation {
  if (layout === 'top') return { horizontalTabsVisible: true, railVisible: false, collapsedHandle: false, overlay: false };
  if (!compact) return { horizontalTabsVisible: false, railVisible: true, collapsedHandle: false, overlay: false };

  const revealed = keyboardRevealed || hovered;
  return { horizontalTabsVisible: false, railVisible: revealed, collapsedHandle: !revealed, overlay: revealed };
}

export function matchesTabRailShortcut(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey'>): boolean {
  return (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'e';
}
