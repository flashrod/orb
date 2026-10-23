import { describe, expect, it } from 'vitest';

/**
 * Permission decision store: remembers per-site (host, permission) choices.
 * Default-deny: anything not explicitly allowed is denied.
 */
type PermissionName = 'notifications' | 'camera' | 'microphone' | 'location' | 'screen';

interface PermissionEntry {
  host: string;
  permission: PermissionName;
  state: 'ask' | 'allow' | 'deny';
  updatedAt: number;
}

class PermissionStore {
  private entries = new Map<string, PermissionEntry>();

  private key(host: string, permission: PermissionName): string {
    return `${host.toLowerCase()}|${permission}`;
  }

  get(host: string, permission: PermissionName): 'ask' | 'allow' | 'deny' {
    return this.entries.get(this.key(host, permission))?.state ?? 'ask';
  }

  set(host: string, permission: PermissionName, state: 'ask' | 'allow' | 'deny'): void {
    this.entries.set(this.key(host, permission), {
      host: host.toLowerCase(),
      permission,
      state,
      updatedAt: Date.now(),
    });
  }

  remove(host: string, permission: PermissionName): void {
    this.entries.delete(this.key(host, permission));
  }

  getAll(): PermissionEntry[] {
    return Array.from(this.entries.values());
  }
}

/**
 * Decides whether to grant a permission request.
 * Returns 'allow' only if explicitly allowed; 'deny' if explicitly denied;
 * otherwise 'ask' (prompt the user).
 */
function decidePermission(store: PermissionStore, host: string, permission: PermissionName): 'allow' | 'deny' | 'ask' {
  const state = store.get(host, permission);
  if (state === 'ask') return 'ask';
  return state === 'allow' ? 'allow' : 'deny';
}

describe('permission handler (default-deny, per-site choices)', () => {
  it('defaults to ask for unknown host+permission', () => {
    const store = new PermissionStore();
    expect(decidePermission(store, 'example.com', 'camera')).toBe('ask');
  });

  it('returns allow when explicitly allowed', () => {
    const store = new PermissionStore();
    store.set('example.com', 'camera', 'allow');
    expect(decidePermission(store, 'example.com', 'camera')).toBe('allow');
  });

  it('returns deny when explicitly denied', () => {
    const store = new PermissionStore();
    store.set('example.com', 'microphone', 'deny');
    expect(decidePermission(store, 'example.com', 'microphone')).toBe('deny');
  });

  it('is scoped per host and per permission', () => {
    const store = new PermissionStore();
    store.set('example.com', 'camera', 'allow');
    // different host → ask
    expect(decidePermission(store, 'other.com', 'camera')).toBe('ask');
    // same host, different permission → ask
    expect(decidePermission(store, 'example.com', 'microphone')).toBe('ask');
  });

  it('is case-insensitive on host', () => {
    const store = new PermissionStore();
    store.set('Example.COM', 'location', 'allow');
    expect(decidePermission(store, 'example.com', 'location')).toBe('allow');
  });

  it('removing an entry returns to ask', () => {
    const store = new PermissionStore();
    store.set('example.com', 'notifications', 'allow');
    store.remove('example.com', 'notifications');
    expect(decidePermission(store, 'example.com', 'notifications')).toBe('ask');
  });
});
