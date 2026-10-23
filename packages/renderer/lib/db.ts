import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

export let db: Database.Database;

export function initDb(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'orb.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Note: In production, schema migrations would be managed here.
  // For v1, schema is applied on first run via the renderer's init.
  console.log(`[Orb DB] Initialized at ${dbPath}`);
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}
