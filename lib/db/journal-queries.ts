import { db, initDb } from "./index";

export type JournalEntry = {
  id: number;
  content: string;
  tags: string[];
  mood: string;
  created_at: string;
  updated_at: string;
};

function rowToEntry(row: Record<string, unknown>): JournalEntry {
  return {
    id: Number(row.id),
    content: row.content as string,
    tags: (row.tags as string)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    mood: row.mood as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createJournalEntry(input: {
  content: string;
  tags?: string[];
  mood?: string;
}): Promise<JournalEntry> {
  await initDb();
  const c = db();
  const tagsStr = (input.tags ?? []).join(",");
  const r = await c.execute({
    sql: `INSERT INTO journal_entries (content, tags, mood) VALUES (?, ?, ?)
          RETURNING id, content, tags, mood, created_at, updated_at`,
    args: [input.content, tagsStr, input.mood ?? ""],
  });
  return rowToEntry(r.rows[0] as unknown as Record<string, unknown>);
}

export async function updateJournalEntry(
  id: number,
  input: { content?: string; tags?: string[]; mood?: string },
): Promise<void> {
  await initDb();
  const c = db();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (input.content !== undefined) {
    sets.push("content = ?");
    args.push(input.content);
  }
  if (input.tags !== undefined) {
    sets.push("tags = ?");
    args.push(input.tags.join(","));
  }
  if (input.mood !== undefined) {
    sets.push("mood = ?");
    args.push(input.mood);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  args.push(id);
  await c.execute({
    sql: `UPDATE journal_entries SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteJournalEntry(id: number): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({ sql: `DELETE FROM journal_entries WHERE id = ?`, args: [id] });
}

export async function listJournalEntries(opts?: {
  query?: string;
  tag?: string;
  fromDate?: string; // ISO yyyy-mm-dd
  toDate?: string;
  limit?: number;
}): Promise<JournalEntry[]> {
  await initDb();
  const c = db();
  const wheres: string[] = [];
  const args: (string | number)[] = [];
  if (opts?.query) {
    wheres.push("(content LIKE ? OR tags LIKE ?)");
    args.push(`%${opts.query}%`, `%${opts.query}%`);
  }
  if (opts?.tag) {
    wheres.push("(',' || tags || ',') LIKE ?");
    args.push(`%,${opts.tag},%`);
  }
  if (opts?.fromDate) {
    wheres.push("date(created_at) >= ?");
    args.push(opts.fromDate);
  }
  if (opts?.toDate) {
    wheres.push("date(created_at) <= ?");
    args.push(opts.toDate);
  }
  const whereSql = wheres.length > 0 ? `WHERE ${wheres.join(" AND ")}` : "";
  const limit = opts?.limit ?? 100;
  args.push(limit);
  const r = await c.execute({
    sql: `SELECT id, content, tags, mood, created_at, updated_at
          FROM journal_entries ${whereSql}
          ORDER BY created_at DESC LIMIT ?`,
    args,
  });
  return r.rows.map((row) => rowToEntry(row as unknown as Record<string, unknown>));
}

export async function getAllJournalTags(): Promise<string[]> {
  await initDb();
  const c = db();
  const r = await c.execute(
    `SELECT DISTINCT tags FROM journal_entries WHERE tags != ''`,
  );
  const set = new Set<string>();
  for (const row of r.rows) {
    const tagsStr = row.tags as string;
    for (const tag of tagsStr.split(",").map((t) => t.trim()).filter(Boolean)) {
      set.add(tag);
    }
  }
  return Array.from(set).sort();
}
