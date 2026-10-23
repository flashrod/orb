import type { Tab, TabGroup } from '../stores/tabs';

export interface TabSnapshot {
  tabs: Tab[];
  activeTabId: string | null;
  groups: TabGroup[];
}

export function restoreTabSnapshot(value: unknown): TabSnapshot {
  if (!value || typeof value !== 'object') return { tabs: [], activeTabId: null, groups: [] };
  const source = value as { tabs?: unknown; activeTabId?: unknown; groups?: unknown };
  if (!Array.isArray(source.tabs)) return { tabs: [], activeTabId: null, groups: [] };
  const tabs = source.tabs.filter((item): item is Tab => Boolean(
    item && typeof item === 'object' &&
    typeof (item as Tab).id === 'string' &&
    typeof (item as Tab).spaceId === 'string' &&
    typeof (item as Tab).url === 'string' &&
    typeof (item as Tab).title === 'string'
  ));
  if (!tabs.length) return { tabs: [], activeTabId: null, groups: [] };
  const groups = Array.isArray(source.groups) ? source.groups.filter((item): item is TabGroup => Boolean(
    item && typeof item === 'object' && typeof (item as TabGroup).id === 'string' && typeof (item as TabGroup).spaceId === 'string' && typeof (item as TabGroup).name === 'string'
  )).map((group) => ({ ...group, collapsed: Boolean(group.collapsed) })) : [];
  const groupIds = new Set(groups.map((group) => group.id));
  const activeTabId = typeof source.activeTabId === 'string' && tabs.some((tab) => tab.id === source.activeTabId)
    ? source.activeTabId
    : tabs.find((tab) => tab.isActive)?.id || tabs[tabs.length - 1].id;
  return {
    tabs: tabs.map((tab) => ({ ...tab, groupId: tab.groupId && groupIds.has(tab.groupId) ? tab.groupId : null, isPinned: Boolean(tab.isPinned), isActive: tab.id === activeTabId })),
    activeTabId,
    groups,
  };
}
