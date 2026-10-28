import { beforeEach, describe, expect, it } from 'vitest';
import './test-localStorage';
import { useSpaceStore } from './spaces';
import { nextProfileId, nextSpaceIndex } from '../lib/spaceNavigation';

function resetStore() {
  useSpaceStore.setState({ spaces: [], activeSpaceId: null });
}

function addSpace(name: string) {
  return useSpaceStore.getState().addSpace({ name, icon: 'globe', color: '#a0522d', tabIds: [] });
}

describe('space store — shortcut handler operations', () => {
  beforeEach(() => {
    resetStore();
  });

  it('switch-by-index activates the space at that position', () => {
    const first = addSpace('One');
    const second = addSpace('Two');

    const store = useSpaceStore.getState();
    store.setActiveSpace(first);
    expect(useSpaceStore.getState().activeSpaceId).toBe(first);

    const index = useSpaceStore.getState().spaces.findIndex((space) => space.id === second);
    store.setActiveSpace(useSpaceStore.getState().spaces[index].id);
    expect(useSpaceStore.getState().activeSpaceId).toBe(second);
  });

  it('next/previous wrap around the space list', () => {
    const first = addSpace('One');
    const second = addSpace('Two');
    const store = useSpaceStore.getState();

    store.setActiveSpace(second);
    let spaces = useSpaceStore.getState().spaces;
    let current = spaces.findIndex((space) => space.id === useSpaceStore.getState().activeSpaceId);
    store.setActiveSpace(spaces[nextSpaceIndex(current, spaces.length, 1)].id);
    expect(useSpaceStore.getState().activeSpaceId).toBe(first);

    spaces = useSpaceStore.getState().spaces;
    current = spaces.findIndex((space) => space.id === useSpaceStore.getState().activeSpaceId);
    store.setActiveSpace(spaces[nextSpaceIndex(current, spaces.length, -1)].id);
    expect(useSpaceStore.getState().activeSpaceId).toBe(second);
  });

  it('cycling the profile updates the active space profileId', () => {
    const spaceId = addSpace('One');
    const store = useSpaceStore.getState();
    store.setActiveSpace(spaceId);
    store.updateSpace(spaceId, { profileId: 'default' });

    const next = nextProfileId(['default', 'work'], useSpaceStore.getState().spaces[0].profileId);
    expect(next).toBe('work');
    store.updateSpace(spaceId, { profileId: next! });

    expect(useSpaceStore.getState().spaces.find((space) => space.id === spaceId)?.profileId).toBe('work');
  });
});
