import { db, initDb } from "./index";

export type GithubContribDay = { date: string; count: number; level: number };
export type SyncLogEntry = {
  source: string;
  status: string;
  message: string | null;
  items_synced: number;
  started_at: string;
  finished_at: string | null;
};

// ============== GitHub ==============

export async function upsertGithubContributions(days: GithubContribDay[]) {
  await initDb();
  const c = db();
  const stmts = days.map((d) => ({
    sql: `INSERT INTO github_contributions (date, count, level, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(date) DO UPDATE SET
            count = excluded.count,
            level = excluded.level,
            updated_at = datetime('now')`,
    args: [d.date, d.count, d.level] as (string | number)[],
  }));
  await c.batch(stmts, "write");
}

export async function getGithubContributions(days = 365): Promise<GithubContribDay[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT date, count, level FROM github_contributions
          WHERE date >= date('now', ?)
          ORDER BY date ASC`,
    args: [`-${days} days`],
  });
  return r.rows.map((row) => ({
    date: row.date as string,
    count: Number(row.count),
    level: Number(row.level),
  }));
}

// ============== Settings (key-value) ==============

export async function getSetting(key: string): Promise<string | null> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT value FROM settings WHERE key = ?`,
    args: [key],
  });
  return r.rows[0]?.value as string | undefined ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [key, value],
  });
}

// ============== Sync Log ==============

export async function logSyncStart(source: string): Promise<number> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `INSERT INTO sync_log (source, status) VALUES (?, 'running') RETURNING id`,
    args: [source],
  });
  return Number(r.rows[0].id);
}

export async function logSyncFinish(id: number, status: "success" | "error", itemsSynced: number, message?: string) {
  await initDb();
  const c = db();
  await c.execute({
    sql: `UPDATE sync_log SET status = ?, items_synced = ?, message = ?, finished_at = datetime('now') WHERE id = ?`,
    args: [status, itemsSynced, message ?? null, id],
  });
}

export async function getLastSyncs(): Promise<SyncLogEntry[]> {
  await initDb();
  const c = db();
  const r = await c.execute(`
    SELECT source, status, message, items_synced, started_at, finished_at
    FROM sync_log
    WHERE id IN (
      SELECT MAX(id) FROM sync_log GROUP BY source
    )
    ORDER BY started_at DESC
  `);
  return r.rows.map((row) => ({
    source: row.source as string,
    status: row.status as string,
    message: row.message as string | null,
    items_synced: Number(row.items_synced),
    started_at: row.started_at as string,
    finished_at: row.finished_at as string | null,
  }));
}
