import { db, initDb } from "./index";
import { localIsoDate } from "@/lib/local-date";

export type Habit = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  target_per_week: number;
  archived: number;
  position: number;
  created_at: string;
};

export type HabitWithStats = Habit & {
  doneToday: boolean;
  currentStreak: number;
  longestStreak: number;
  thisWeekCount: number;
  last30DaysLogs: string[]; // ISO dates
  consistencyPct: number; // % dias feitos nos últimos 30
};

function isoDate(d: Date): string {
  return localIsoDate(d);
}

export async function listHabits(): Promise<Habit[]> {
  await initDb();
  const c = db();
  const r = await c.execute(
    `SELECT id, name, emoji, color, target_per_week, archived, position, created_at
     FROM habits WHERE archived = 0 ORDER BY position ASC, id ASC`,
  );
  return r.rows.map((row) => ({
    id: Number(row.id),
    name: row.name as string,
    emoji: row.emoji as string,
    color: row.color as string,
    target_per_week: Number(row.target_per_week),
    archived: Number(row.archived),
    position: Number(row.position),
    created_at: row.created_at as string,
  }));
}

export async function createHabit(input: {
  name: string;
  emoji?: string;
  color?: string;
  target_per_week?: number;
}): Promise<Habit> {
  await initDb();
  const c = db();
  const posR = await c.execute(`SELECT COALESCE(MAX(position), 0) + 1 as next FROM habits`);
  const position = Number(posR.rows[0].next);
  const r = await c.execute({
    sql: `INSERT INTO habits (name, emoji, color, target_per_week, position)
          VALUES (?, ?, ?, ?, ?) RETURNING id, name, emoji, color, target_per_week, archived, position, created_at`,
    args: [
      input.name,
      input.emoji ?? "✨",
      input.color ?? "accent",
      input.target_per_week ?? 7,
      position,
    ],
  });
  const row = r.rows[0];
  return {
    id: Number(row.id),
    name: row.name as string,
    emoji: row.emoji as string,
    color: row.color as string,
    target_per_week: Number(row.target_per_week),
    archived: Number(row.archived),
    position: Number(row.position),
    created_at: row.created_at as string,
  };
}

export async function updateHabit(
  id: number,
  input: { name?: string; emoji?: string; color?: string; target_per_week?: number },
): Promise<void> {
  await initDb();
  const c = db();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (input.name !== undefined) {
    sets.push("name = ?");
    args.push(input.name);
  }
  if (input.emoji !== undefined) {
    sets.push("emoji = ?");
    args.push(input.emoji);
  }
  if (input.color !== undefined) {
    sets.push("color = ?");
    args.push(input.color);
  }
  if (input.target_per_week !== undefined) {
    sets.push("target_per_week = ?");
    args.push(input.target_per_week);
  }
  if (sets.length === 0) return;
  args.push(id);
  await c.execute({ sql: `UPDATE habits SET ${sets.join(", ")} WHERE id = ?`, args });
}

export async function reorderHabits(ids: number[]): Promise<void> {
  await initDb();
  const c = db();
  // Atualiza position de cada hábito de acordo com a ordem
  await Promise.all(
    ids.map((id, idx) =>
      c.execute({
        sql: `UPDATE habits SET position = ? WHERE id = ?`,
        args: [idx + 1, id],
      }),
    ),
  );
}

export async function archiveHabit(id: number): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({ sql: `UPDATE habits SET archived = 1 WHERE id = ?`, args: [id] });
}

export async function logHabit(habitId: number, date: string): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({
    sql: `INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?, ?)`,
    args: [habitId, date],
  });
}

export async function unlogHabit(habitId: number, date: string): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({
    sql: `DELETE FROM habit_logs WHERE habit_id = ? AND date = ?`,
    args: [habitId, date],
  });
}

async function getLogsByHabit(): Promise<Map<number, string[]>> {
  await initDb();
  const c = db();
  const r = await c.execute(
    `SELECT habit_id, date FROM habit_logs WHERE date >= date('now', '-365 days') ORDER BY date DESC`,
  );
  const m = new Map<number, string[]>();
  for (const row of r.rows) {
    const id = Number(row.habit_id);
    if (!m.has(id)) m.set(id, []);
    m.get(id)!.push(row.date as string);
  }
  return m;
}

function computeStreaks(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };
  const set = new Set(dates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoDate(today);

  // Streak atual: do hoje pra trás
  const startOffset = set.has(todayIso) ? 0 : 1;
  let current = 0;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (set.has(isoDate(d))) current++;
    else break;
  }

  // Longest: varre os últimos 365 dias
  let longest = 0;
  let run = 0;
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (set.has(isoDate(d))) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  return { current, longest };
}

export async function listHabitsWithStats(): Promise<HabitWithStats[]> {
  const [habits, logsByHabit] = await Promise.all([listHabits(), getLogsByHabit()]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoDate(today);

  // Inicio da semana ISO (segunda)
  const dayOfWeek = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  const weekStartIso = isoDate(weekStart);

  return habits.map((h) => {
    const dates = logsByHabit.get(h.id) ?? [];
    const set = new Set(dates);
    const { current, longest } = computeStreaks(dates);

    // Esta semana
    let thisWeekCount = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d > today) break;
      if (set.has(isoDate(d))) thisWeekCount++;
    }

    // Últimos 30 dias
    const last30: string[] = [];
    let done30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = isoDate(d);
      if (set.has(iso)) {
        last30.push(iso);
        done30++;
      }
    }
    const consistencyPct = (done30 / 30) * 100;

    return {
      ...h,
      doneToday: set.has(todayIso),
      currentStreak: current,
      longestStreak: longest,
      thisWeekCount,
      last30DaysLogs: last30,
      consistencyPct,
    };
  });
}

export async function getHabitHistory(habitId: number, days = 365): Promise<string[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT date FROM habit_logs
          WHERE habit_id = ? AND date >= date('now', ?)
          ORDER BY date ASC`,
    args: [habitId, `-${days} days`],
  });
  return r.rows.map((row) => row.date as string);
}

export async function getHabitById(habitId: number): Promise<Habit | null> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT id, name, emoji, color, target_per_week, archived, position, created_at
          FROM habits WHERE id = ?`,
    args: [habitId],
  });
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  return {
    id: Number(row.id),
    name: row.name as string,
    emoji: row.emoji as string,
    color: row.color as string,
    target_per_week: Number(row.target_per_week),
    archived: Number(row.archived),
    position: Number(row.position),
    created_at: row.created_at as string,
  };
}

export type HabitsCalendar = {
  habits: { id: number; name: string; emoji: string; color: string }[];
  // mapa: date ISO → set de habit_ids feitos no dia
  logs: Record<string, number[]>;
};

export type HabitsYearlyData = {
  habits: { id: number; name: string; emoji: string; color: string }[];
  // date → habit_ids feitos
  logs: Record<string, number[]>;
};

export async function getHabitsYearly(habitId?: number | null): Promise<HabitsYearlyData> {
  await initDb();
  const c = db();
  const habitsR = await c.execute(
    `SELECT id, name, emoji, color FROM habits WHERE archived = 0 ORDER BY position, id`,
  );
  const habits = habitsR.rows.map((row) => ({
    id: Number(row.id),
    name: row.name as string,
    emoji: row.emoji as string,
    color: row.color as string,
  }));

  const sql = habitId
    ? `SELECT habit_id, date FROM habit_logs
       WHERE date >= date('now', '-365 days') AND habit_id = ?
       ORDER BY date ASC`
    : `SELECT habit_id, date FROM habit_logs
       WHERE date >= date('now', '-365 days')
       ORDER BY date ASC`;
  const args = habitId ? [habitId] : [];
  const logsR = await c.execute({ sql, args });
  const logs: Record<string, number[]> = {};
  for (const row of logsR.rows) {
    const date = row.date as string;
    const hid = Number(row.habit_id);
    if (!logs[date]) logs[date] = [];
    logs[date].push(hid);
  }
  return { habits, logs };
}

export async function getHabitsCalendar(year: number, month: number): Promise<HabitsCalendar> {
  await initDb();
  const c = db();
  // month: 1-12 → SQLite usa 01-12
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const habitsR = await c.execute(
    `SELECT id, name, emoji, color FROM habits WHERE archived = 0 ORDER BY position, id`,
  );
  const habits = habitsR.rows.map((row) => ({
    id: Number(row.id),
    name: row.name as string,
    emoji: row.emoji as string,
    color: row.color as string,
  }));
  const logsR = await c.execute({
    sql: `SELECT habit_id, date FROM habit_logs
          WHERE date LIKE ?
          ORDER BY date ASC, habit_id ASC`,
    args: [`${ym}-%`],
  });
  const logs: Record<string, number[]> = {};
  for (const row of logsR.rows) {
    const date = row.date as string;
    const habitId = Number(row.habit_id);
    if (!logs[date]) logs[date] = [];
    logs[date].push(habitId);
  }
  return { habits, logs };
}

export async function getHabitsCount(): Promise<{ active: number; total: number }> {
  await initDb();
  const c = db();
  const r = await c.execute(`SELECT
    SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END) as active,
    COUNT(*) as total FROM habits`);
  return {
    active: Number(r.rows[0]?.active ?? 0),
    total: Number(r.rows[0]?.total ?? 0),
  };
}
