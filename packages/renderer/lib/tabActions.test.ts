import { describe, expect, it } from 'vitest';
import { getTabsToClose, orderPinnedTabsFirst } from './tabActions';

describe('browser tab actions', () => {
  const tabs = [
    { id: 'a', isPinned: false },
    { id: 'b', isPinned: true },
    { id: 'c', isPinned: false },
  ];

  it('keeps pinned tabs grouped at the beginning while preserving each group order', () => {
    expect(orderPinnedTabsFirst(tabs).map((tab) => tab.id)).toEqual(['b', 'a', 'c']);
  });

  it('closes tabs to the right of the selected tab only', () => {
    expect(getTabsToClose(orderPinnedTabsFirst(tabs), 'a', 'right')).toEqual(['c']);
  });

  it('closes every other tab in the current space', () => {
    expect(getTabsToClose(orderPinnedTabsFirst(tabs), 'b', 'others')).toEqual(['a', 'c']);
  });
});
