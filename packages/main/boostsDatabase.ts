import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { BoostRecord, NewBoost } from '../shared/boosts';

const MAX_SCRIPT_LENGTH = 1_000_000;
let databasePromise: Promise<BoostsDatabase> | undefined;

function validateBoost(boost: NewBoost): BoostRecord {
  const domain = typeof boost.domain === 'string' ? boost.domain.trim().toLowerCase() : '';
  const domainPattern = /^(?:\*\.)?(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})$/i;
  if (!domainPattern.test(domain)) throw new Error('Enter a valid hostname, such as example.com.');
  if (typeof boost.id !== 'string' || boost.id.length < 1 || boost.id.length > 128) throw new Error('Boost ID is invalid.');
  if (typeof boost.css !== 'string' || typeof boost.js !== 'string') throw new Error('Boost CSS and JavaScript must be text.');
  if (boost.css.length > MAX_SCRIPT_LENGTH || boost.js.length > MAX_SCRIPT_LENGTH) throw new Error('Boost CSS and JavaScript must each be under 1 MB.');

  const now = Date.now();
  return {
    id: boost.id,
    domain,
    css: boost.css,
    js: boost.js,
    enabled: Boolean(boost.enabled),
    createdAt: Number.isFinite(boost.createdAt) ? Number(boost.createdAt) : now,
    updatedAt: Number.isFinite(boost.updatedAt) ? Number(boost.updatedAt) : now,
  };
}

export class BoostsDatabase {
  private constructor(private readonly database: Database, private readonly filePath: string) {}

  static async open(filePath: string): Promise<BoostsDatabase> {
    const SQL: SqlJsStatic = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const database = fs.existsSync(filePath)
      ? new SQL.Database(fs.readFileSync(filePath))
      : new SQL.Database();
    database.run(`
      CREATE TABLE IF NOT EXISTS boosts (
        id TEXT PRIMARY KEY NOT NULL,
        domain TEXT NOT NULL,
        css TEXT NOT NULL DEFAULT '',
        js TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS boosts_domain_idx ON boosts(domain);
    `);
    const store = new BoostsDatabase(database, filePath);
    if (!fs.existsSync(filePath)) store.flush();
    return store;
  }

  getAll(): BoostRecord[] {
    const result = this.database.exec('SELECT id, domain, css, js, enabled, created_at, updated_at FROM boosts ORDER BY created_at, id')[0];
    if (!result) return [];
    return result.values.map(([id, domain, css, js, enabled, createdAt, updatedAt]) => ({
      id: String(id),
      domain: String(domain),
      css: String(css),
      js: String(js),
      enabled: Number(enabled) === 1,
      createdAt: Number(createdAt),
      updatedAt: Number(updatedAt),
    }));
  }

  save(input: NewBoost): BoostRecord {
    const boost = validateBoost(input);
    this.database.run(
      `INSERT INTO boosts (id, domain, css, js, enabled, created_at, updated_at)
       VALUES ($id, $domain, $css, $js, $enabled, $created, $updated)
       ON CONFLICT(id) DO UPDATE SET domain=excluded.domain, css=excluded.css, js=excluded.js,
         enabled=excluded.enabled, updated_at=excluded.updated_at`,
      {
        $id: boost.id,
        $domain: boost.domain,
        $css: boost.css,
        $js: boost.js,
        $enabled: boost.enabled ? 1 : 0,
        $created: boost.createdAt,
        $updated: boost.updatedAt,
      }
    );
    this.flush();
    return boost;
  }

  delete(id: string): void {
    if (typeof id !== 'string' || id.length < 1 || id.length > 128) throw new Error('Boost ID is invalid.');
    this.database.run('DELETE FROM boosts WHERE id = $id', { $id: id });
    this.flush();
  }

  private flush(): void {
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, Buffer.from(this.database.export()));
    fs.renameSync(temporaryPath, this.filePath);
  }
}

export function getBoostsDatabase(): Promise<BoostsDatabase> {
  if (!databasePromise) {
    databasePromise = BoostsDatabase.open(path.join(app.getPath('userData'), 'orb.sqlite3'));
  }
  return databasePromise;
}
