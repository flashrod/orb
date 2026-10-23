export interface GroupableTab {
  id: string;
  spaceId: string;
  isPinned: boolean;
  groupId?: string | null;
}

export interface TabGroupSummary {
  id: string;
  spaceId: string;
  name: string;
  color: string;
  collapsed: boolean;
}

export function partitionTabsByGroup<T extends GroupableTab, G extends TabGroupSummary>(tabs: T[], groups: G[], spaceId: string) {
  const scopedTabs = tabs.filter((tab) => tab.spaceId === spaceId);
  const pinned = scopedTabs.filter((tab) => tab.isPinned);
  const activeGroups = groups.filter((group) => group.spaceId === spaceId);
  const grouped = activeGroups.map((group) => {
    const groupTabs = scopedTabs.filter((tab) => !tab.isPinned && tab.groupId === group.id);
    return { group, tabs: groupTabs };
  }).filter(({ tabs: groupTabs }) => groupTabs.length > 0);
  const loose = scopedTabs.filter((tab) => !tab.isPinned && (!tab.groupId || !activeGroups.some((group) => group.id === tab.groupId)));
  return { pinned, groups: grouped, loose };
}
