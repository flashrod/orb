import { describe, expect, it } from 'vitest';
import { partitionTabsByGroup } from './tabGroups';

describe('tab groups', () => {
  const tabs = [
    { id: 'pin', spaceId: 'work', isPinned: true, groupId: 'g1' },
    { id: 'a', spaceId: 'work', isPinned: false, groupId: 'g1' },
    { id: 'b', spaceId: 'work', isPinned: false, groupId: 'g1' },
    { id: 'loose', spaceId: 'work', isPinned: false, groupId: null },
    { id: 'orphan', spaceId: 'work', isPinned: false, groupId: 'deleted' },
    { id: 'other-space', spaceId: 'personal', isPinned: false, groupId: 'g1' },
  ];
  const groups = [{ id: 'g1', spaceId: 'work', name: 'Research', color: '#657a60', collapsed: true }];

  it('separates pinned tabs, scoped groups, loose tabs, and orphaned assignments', () => {
    const result = partitionTabsByGroup(tabs, groups, 'work');
    expect(result.pinned.map((tab) => tab.id)).toEqual(['pin']);
    expect(result.groups.map((entry) => [entry.group.name, entry.tabs.map((tab) => tab.id)])).toEqual([['Research', ['a', 'b']]]);
    expect(result.loose.map((tab) => tab.id)).toEqual(['loose', 'orphan']);
  });
});
