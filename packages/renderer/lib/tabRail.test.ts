import { describe, expect, it } from 'vitest';
import { getTabRailPresentation, matchesTabRailShortcut } from './tabRail';

describe('side tab rail presentation', () => {
  it('never renders a side rail in top-tab mode', () => {
    expect(getTabRailPresentation('top', true, true, true)).toEqual({ horizontalTabsVisible: true, railVisible: false, collapsedHandle: false, overlay: false });
  });

  it('keeps the full side rail visible outside compact mode', () => {
    expect(getTabRailPresentation('split', false, false, false)).toEqual({ horizontalTabsVisible: false, railVisible: true, collapsedHandle: false, overlay: false });
  });

  it('collapses the side rail until a shortcut reveals it', () => {
    expect(getTabRailPresentation('split', true, false, false)).toEqual({ horizontalTabsVisible: false, railVisible: false, collapsedHandle: true, overlay: false });
    expect(getTabRailPresentation('split', true, true, false)).toEqual({ horizontalTabsVisible: false, railVisible: true, collapsedHandle: false, overlay: true });
  });

  it('reveals the compact rail while its edge is hovered', () => {
    expect(getTabRailPresentation('split', true, false, true)).toEqual({ horizontalTabsVisible: false, railVisible: true, collapsedHandle: false, overlay: true });
  });
});

describe('compact side-tab shortcut', () => {
  it('accepts Command or Control plus Shift+E', () => {
    expect(matchesTabRailShortcut({ key: 'e', metaKey: true, ctrlKey: false, shiftKey: true })).toBe(true);
    expect(matchesTabRailShortcut({ key: 'E', metaKey: false, ctrlKey: true, shiftKey: true })).toBe(true);
  });

  it('rejects partial or unrelated shortcuts', () => {
    expect(matchesTabRailShortcut({ key: 'e', metaKey: true, ctrlKey: false, shiftKey: false })).toBe(false);
    expect(matchesTabRailShortcut({ key: 'k', metaKey: true, ctrlKey: false, shiftKey: true })).toBe(false);
    expect(matchesTabRailShortcut({ key: 'e', metaKey: false, ctrlKey: false, shiftKey: true })).toBe(false);
  });
});
