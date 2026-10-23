import { app, session } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const orbSession = session.fromPartition('persist:orb');
const registryPath = () => path.join(app.getPath('userData'), 'extensions.json');

async function readPaths(): Promise<string[]> {
  try {
    const value = JSON.parse(await fs.readFile(registryPath(), 'utf8'));
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch { return []; }
}

async function writePaths(paths: string[]): Promise<void> {
  const target = registryPath();
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(paths, null, 2), 'utf8');
  await fs.rename(temporary, target);
}

export async function restoreExtensions(): Promise<void> {
  for (const directory of await readPaths()) {
    try { await orbSession.loadExtension(directory); }
    catch (error) { console.error(`Could not restore extension at ${directory}:`, error); }
  }
}

export function listExtensions() {
  return orbSession.getAllExtensions().map(({ id, name, version }) => ({ id, name, version }));
}

export async function installExtension(directory: string) {
  const extension = await orbSession.loadExtension(directory);
  const paths = await readPaths();
  if (!paths.includes(extension.path)) await writePaths([...paths, extension.path]);
  return { id: extension.id, name: extension.name, version: extension.version };
}

export async function removeExtension(id: string): Promise<void> {
  const extension = orbSession.getExtension(id);
  if (!extension) return;
  orbSession.removeExtension(id);
  const paths = (await readPaths()).filter((directory) => directory !== extension.path);
  await writePaths(paths);
}
