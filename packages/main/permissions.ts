import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

export type PermissionName = 'notifications' | 'camera' | 'microphone' | 'location' | 'screen';

export type PermissionState = 'ask' | 'allow' | 'deny';

export interface PermissionEntry {
  host: string;
  permission: PermissionName;
  state: PermissionState;
  updatedAt: number;
}

const DEFAULT_STATES: Record<PermissionName, PermissionState> = {
  notifications: 'ask',
  camera: 'ask',
  microphone: 'ask',
  location: 'ask',
  screen: 'ask',
};

export class PermissionStore {
  private entries = new Map<string, PermissionEntry>();
  private registryPath: string;

  constructor() {
    this.registryPath = path.join(app.getPath('userData'), 'permissions.json');
  }

  private key(host: string, permission: PermissionName): string {
    return `${host.toLowerCase()}|${permission}`;
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.registryPath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry && entry.host && entry.permission && entry.state) {
            this.entries.set(this.key(entry.host, entry.permission), entry);
          }
        }
      }
    } catch {
      // No existing permissions file — start fresh with defaults
    }
  }

  private async save(): Promise<void> {
    const data = Array.from(this.entries.values());
    const tmp = `${this.registryPath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, this.registryPath);
  }

  get(host: string, permission: PermissionName): PermissionState {
    return this.entries.get(this.key(host, permission))?.state ?? 'ask';
  }

  async set(host: string, permission: PermissionName, state: PermissionState): Promise<void> {
    this.entries.set(this.key(host, permission), {
      host: host.toLowerCase(),
      permission,
      state,
      updatedAt: Date.now(),
    });
    await this.save();
  }

  async remove(host: string, permission: PermissionName): Promise<void> {
    this.entries.delete(this.key(host, permission));
    await this.save();
  }

  getAll(): PermissionEntry[] {
    return Array.from(this.entries.values());
  }

  getDefaultState(permission: PermissionName): PermissionState {
    return DEFAULT_STATES[permission];
  }
}
