export interface PinnedTabState {
  id: string;
  isPinned: boolean;
}

export function orderPinnedTabsFirst<T extends PinnedTabState>(tabs: T[]): T[] {
  return [...tabs.filter((tab) => tab.isPinned), ...tabs.filter((tab) => !tab.isPinned)];
}

export function getTabsToClose<T extends { id: string }>(
  tabs: T[],
  targetId: string,
  direction: 'right' | 'others',
): string[] {
  const targetIndex = tabs.findIndex((tab) => tab.id === targetId);
  if (targetIndex < 0) return [];
  return tabs.filter((tab, index) => direction === 'right' ? index > targetIndex : index !== targetIndex).map((tab) => tab.id);
}
