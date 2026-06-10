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
    sql: `SELECT date(completed_at, 'localtime') as date, COUNT(*) as count
          FROM trello_tasks_completed
          WHERE completed_at >= datetime('now', ?)
          GROUP BY date(completed_at, 'localtime')
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
    sql: `SELECT CAST(strftime('%H', completed_at, 'localtime') AS INTEGER) as hour, COUNT(*) as count
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
    sql: `SELECT CAST(strftime('%w', completed_at, 'localtime') AS INTEGER) as weekday, COUNT(*) as count
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

// ============== Pinned Cards ==============

export type PinnedCard = {
  card_id: string;
  board_id: string | null;
  card_name: string | null;
  list_name: string | null;
  url: string | null;
  pinned_at: string;
};

export async function pinCard(input: {
  card_id: string;
  board_id?: string | null;
  card_name?: string | null;
  list_name?: string | null;
  url?: string | null;
}): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({
    sql: `INSERT INTO pinned_cards (card_id, board_id, card_name, list_name, url)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(card_id) DO UPDATE SET
            board_id = excluded.board_id,
            card_name = excluded.card_name,
            list_name = excluded.list_name,
            url = excluded.url,
            pinned_at = datetime('now')`,
    args: [
      input.card_id,
      input.board_id ?? null,
      input.card_name ?? null,
      input.list_name ?? null,
      input.url ?? null,
    ],
  });
}

export async function unpinCard(cardId: string): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({ sql: `DELETE FROM pinned_cards WHERE card_id = ?`, args: [cardId] });
}

export async function getPinnedCards(limit = 10): Promise<PinnedCard[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT card_id, board_id, card_name, list_name, url, pinned_at
          FROM pinned_cards
          ORDER BY pinned_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return r.rows.map((row) => ({
    card_id: row.card_id as string,
    board_id: row.board_id as string | null,
    card_name: row.card_name as string | null,
    list_name: row.list_name as string | null,
    url: row.url as string | null,
    pinned_at: row.pinned_at as string,
  }));
}

export async function getPinnedCardIds(): Promise<Set<string>> {
  await initDb();
  const c = db();
  const r = await c.execute(`SELECT card_id FROM pinned_cards`);
  return new Set(r.rows.map((row) => row.card_id as string));
}

/**
 * Pega pinned cards validando cada um contra o Trello. Cards que retornam 404
 * (ou estão arquivados) são removidos do banco. Erros de rede/auth não removem
 * — preservam o pin. Retorna só os pins válidos.
 */
export async function getValidatedPinnedCards(limit = 10): Promise<PinnedCard[]> {
  const { cardExists } = await import("@/lib/integrations/trello-api");
  const all = await getPinnedCards(100);
  if (all.length === 0) return [];
  const checks = await Promise.all(
    all.map(async (p) => {
      try {
        const exists = await cardExists(p.card_id);
        return { card: p, exists };
      } catch {
        return { card: p, exists: null as boolean | null };
      }
    }),
  );
  for (const c of checks) {
    if (c.exists === false) {
      try {
        await unpinCard(c.card.card_id);
      } catch {
        // ignora
      }
    }
  }
  return checks
    .filter((c) => c.exists !== false)
    .map((c) => c.card)
    .slice(0, limit);
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
