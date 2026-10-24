import { describe, expect, it } from 'vitest';
import { countDecisions, groupPermissions, permissionLabel } from './permissionsView';

describe('groupPermissions', () => {
  it('groups decisions by host and sorts hosts', () => {
    const groups = groupPermissions([
      { host: 'b.example', permission: 'camera', state: 'deny' },
      { host: 'a.example', permission: 'microphone', state: 'allow' },
      { host: 'b.example', permission: 'location', state: 'ask' },
    ]);
    expect(groups.map((group) => group.host)).toEqual(['a.example', 'b.example']);
    expect(groups[1].entries.map((entry) => entry.permission)).toEqual(['camera', 'location']);
  });

  it('normalizes host and permission casing', () => {
    const [group] = groupPermissions([{ host: ' Example.COM ', permission: ' Camera ', state: 'allow' }]);
    expect(group.host).toBe('example.com');
    expect(group.entries[0].permission).toBe('camera');
  });

  it('orders permissions consistently', () => {
    const [group] = groupPermissions([
      { host: 'example.com', permission: 'screen', state: 'ask' },
      { host: 'example.com', permission: 'notifications', state: 'ask' },
      { host: 'example.com', permission: 'camera', state: 'ask' },
    ]);
    expect(group.entries.map((entry) => entry.permission)).toEqual(['camera', 'notifications', 'screen']);
  });

  it('drops malformed entries instead of rendering blank rows', () => {
    const groups = groupPermissions([
      { host: '', permission: 'camera', state: 'ask' },
      { host: 'example.com', permission: '', state: 'ask' },
      { host: 'example.com', permission: 'camera', state: 'allow' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(1);
  });
});

describe('permissionLabel', () => {
  it('uses human labels for known permissions', () => {
    expect(permissionLabel('camera')).toBe('Camera');
    expect(permissionLabel('screen')).toBe('Screen sharing');
  });

  it('falls back to the raw name for unknown permissions', () => {
    expect(permissionLabel('midi')).toBe('midi');
  });
});

describe('countDecisions', () => {
  it('counts allow and deny decisions only', () => {
    expect(countDecisions([
      { host: 'a', permission: 'camera', state: 'allow' },
      { host: 'b', permission: 'camera', state: 'deny' },
      { host: 'c', permission: 'camera', state: 'ask' },
    ])).toEqual({ allow: 1, deny: 1 });
  });
});
