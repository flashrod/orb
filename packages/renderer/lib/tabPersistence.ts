import type { Tab } from '../stores/tabs';

export interface TabSnapshot {
  tabs: Tab[];
  activeTabId: string | null;
}

export function restoreTabSnapshot(value: unknown): TabSnapshot {
  if (!value || typeof value !== 'object') return { tabs: [], activeTabId: null };
  const source = value as { tabs?: unknown; activeTabId?: unknown };
  if (!Array.isArray(source.tabs)) return { tabs: [], activeTabId: null };
  const tabs = source.tabs.filter((item): item is Tab => Boolean(
    item && typeof item === 'object' &&
    typeof (item as Tab).id === 'string' &&
    typeof (item as Tab).spaceId === 'string' &&
    typeof (item as Tab).url === 'string' &&
    typeof (item as Tab).title === 'string'
  ));
  if (!tabs.length) return { tabs: [], activeTabId: null };
  const activeTabId = typeof source.activeTabId === 'string' && tabs.some((tab) => tab.id === source.activeTabId)
    ? source.activeTabId
    : tabs.find((tab) => tab.isActive)?.id || tabs[tabs.length - 1].id;
  return {
    tabs: tabs.map((tab) => ({ ...tab, isPinned: Boolean(tab.isPinned), isActive: tab.id === activeTabId })),
    activeTabId,
  };
}
