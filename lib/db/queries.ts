import { db, initDb } from "./index";

export type GithubContribDay = { date: string; count: number; level: number };
export type TrelloTaskRow = {
  id: string;
  card_id: string;
  card_name: string;
  board_id: string;
  board_name: string | null;
  list_id: string;
  list_name: string | null;
  completed_at: string;
  url: string | null;
};
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

// ============== Trello ==============

export type TrelloTaskInsert = Omit<TrelloTaskRow, "url"> & {
  url?: string | null;
  raw_action_id?: string | null;
};

export async function upsertTrelloCompletedTasks(tasks: TrelloTaskInsert[]) {
  await initDb();
  if (tasks.length === 0) return;
  const c = db();
  const stmts = tasks.map((t) => ({
    sql: `INSERT INTO trello_tasks_completed
          (id, card_id, card_name, board_id, board_name, list_id, list_name, completed_at, url, raw_action_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            card_name = excluded.card_name,
            board_name = excluded.board_name,
            list_name = excluded.list_name,
            completed_at = excluded.completed_at,
            url = excluded.url`,
    args: [
      t.id,
      t.card_id,
      t.card_name,
      t.board_id,
      t.board_name ?? null,
      t.list_id,
      t.list_name ?? null,
      t.completed_at,
      t.url ?? null,
      t.raw_action_id ?? null,
    ] as (string | number | null)[],
  }));
  await c.batch(stmts, "write");
}

export async function getTrelloCompletedByDay(days = 90): Promise<{ date: string; count: number }[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT date(completed_at) as date, COUNT(*) as count
          FROM trello_tasks_completed
          WHERE completed_at >= datetime('now', ?)
          GROUP BY date(completed_at)
          ORDER BY date ASC`,
    args: [`-${days} days`],
  });
  return r.rows.map((row) => ({
    date: row.date as string,
    count: Number(row.count),
  }));
}

export async function getTrelloByBoard(days = 90): Promise<{ board_name: string; count: number }[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT COALESCE(board_name, board_id) as board_name, COUNT(*) as count
          FROM trello_tasks_completed
          WHERE completed_at >= datetime('now', ?)
          GROUP BY board_name
          ORDER BY count DESC
          LIMIT 10`,
    args: [`-${days} days`],
  });
  return r.rows.map((row) => ({
    board_name: row.board_name as string,
    count: Number(row.count),
  }));
}

export async function getTrelloCompletedByHour(days = 90): Promise<{ hour: number; count: number }[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT CAST(strftime('%H', completed_at) AS INTEGER) as hour, COUNT(*) as count
          FROM trello_tasks_completed
          WHERE completed_at >= datetime('now', ?)
          GROUP BY hour
          ORDER BY hour ASC`,
    args: [`-${days} days`],
  });
  return r.rows.map((row) => ({
    hour: Number(row.hour),
    count: Number(row.count),
  }));
}

export async function getTrelloCompletedByWeekday(days = 90): Promise<{ weekday: number; count: number }[]> {
  await initDb();
  const c = db();
  // strftime %w: 0=Domingo, 1=Segunda, ..., 6=Sabado
  const r = await c.execute({
    sql: `SELECT CAST(strftime('%w', completed_at) AS INTEGER) as weekday, COUNT(*) as count
          FROM trello_tasks_completed
          WHERE completed_at >= datetime('now', ?)
          GROUP BY weekday
          ORDER BY weekday ASC`,
    args: [`-${days} days`],
  });
  return r.rows.map((row) => ({
    weekday: Number(row.weekday),
    count: Number(row.count),
  }));
}

export async function getRecentTrelloTasks(limit = 10): Promise<TrelloTaskRow[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT id, card_id, card_name, board_id, board_name, list_id, list_name, completed_at, url
          FROM trello_tasks_completed
          ORDER BY completed_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return r.rows.map((row) => ({
    id: row.id as string,
    card_id: row.card_id as string,
    card_name: row.card_name as string,
    board_id: row.board_id as string,
    board_name: row.board_name as string | null,
    list_id: row.list_id as string,
    list_name: row.list_name as string | null,
    completed_at: row.completed_at as string,
    url: row.url as string | null,
  }));
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
