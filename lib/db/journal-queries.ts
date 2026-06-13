import { db, initDb } from "./index";

export type JournalEntry = {
  id: number;
  content: string;
  tags: string[];
  mood: string;
  energy: number; // 0 = não informado, 1-5
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
    energy: row.energy == null ? 0 : Number(row.energy),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function clampEnergy(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

export async function createJournalEntry(input: {
  content: string;
  tags?: string[];
  mood?: string;
  energy?: number;
}): Promise<JournalEntry> {
  await initDb();
  const c = db();
  const tagsStr = (input.tags ?? []).join(",");
  const r = await c.execute({
    sql: `INSERT INTO journal_entries (content, tags, mood, energy) VALUES (?, ?, ?, ?)
          RETURNING id, content, tags, mood, energy, created_at, updated_at`,
    args: [input.content, tagsStr, input.mood ?? "", clampEnergy(input.energy)],
  });
  return rowToEntry(r.rows[0] as unknown as Record<string, unknown>);
}

export async function updateJournalEntry(
  id: number,
  input: { content?: string; tags?: string[]; mood?: string; energy?: number },
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
  if (input.energy !== undefined) {
    sets.push("energy = ?");
    args.push(clampEnergy(input.energy));
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
    wheres.push("date(created_at, 'localtime') >= ?");
    args.push(opts.fromDate);
  }
  if (opts?.toDate) {
    wheres.push("date(created_at, 'localtime') <= ?");
    args.push(opts.toDate);
  }
  const whereSql = wheres.length > 0 ? `WHERE ${wheres.join(" AND ")}` : "";
  const limit = opts?.limit ?? 100;
  args.push(limit);
  const r = await c.execute({
    sql: `SELECT id, content, tags, mood, energy, created_at, updated_at
          FROM journal_entries ${whereSql}
          ORDER BY created_at DESC LIMIT ?`,
    args,
  });
  return r.rows.map((row) => rowToEntry(row as unknown as Record<string, unknown>));
}

export type JournalStats = {
  totalEntries: number;
  tagCounts: { tag: string; count: number }[];
  moodCounts: { mood: string; count: number }[];
  byMonth: { label: string; count: number }[];
};

export async function getJournalStats(): Promise<JournalStats> {
  await initDb();
  const c = db();

  const totalR = await c.execute(`SELECT COUNT(*) as n FROM journal_entries`);
  const totalEntries = Number(totalR.rows[0]?.n ?? 0);

  // Tag counts via parsing client-side (tags são CSV)
  const tagsR = await c.execute(
    `SELECT tags FROM journal_entries WHERE tags != ''`,
  );
  const tagMap = new Map<string, number>();
  for (const row of tagsR.rows) {
    const tagsStr = row.tags as string;
    for (const tag of tagsStr.split(",").map((t) => t.trim()).filter(Boolean)) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }
  const tagCounts = Array.from(tagMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  // Mood counts (apenas moods não-vazios)
  const moodR = await c.execute(
    `SELECT mood, COUNT(*) as n FROM journal_entries WHERE mood != '' GROUP BY mood ORDER BY n DESC`,
  );
  const moodCounts = moodR.rows.map((row) => ({
    mood: row.mood as string,
    count: Number(row.n),
  }));

  // Entries por mês (últimos 12)
  const byMonthR = await c.execute(
    `SELECT strftime('%Y-%m', created_at, 'localtime') as ym, COUNT(*) as n
     FROM journal_entries
     WHERE created_at >= date('now', '-12 months')
     GROUP BY ym
     ORDER BY ym ASC`,
  );
  const monthMap = new Map<string, number>();
  for (const row of byMonthR.rows) {
    monthMap.set(row.ym as string, Number(row.n));
  }
  const months: { label: string; count: number }[] = [];
  const now = new Date();
  now.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(now.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][d.getMonth()];
    months.push({ label: monthLabel, count: monthMap.get(ym) ?? 0 });
  }

  return { totalEntries, tagCounts, moodCounts, byMonth: months };
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
