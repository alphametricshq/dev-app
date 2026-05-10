import { db, initDb } from "./index";

export type PomodoroSession = {
  id: number;
  type: "focus" | "short_break" | "long_break";
  duration_min: number;
  started_at: string;
  finished_at: string;
  card_id: string | null;
  card_name: string | null;
  completed: number;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function recordPomodoroSession(input: {
  type: "focus" | "short_break" | "long_break";
  duration_min: number;
  started_at?: string;
  finished_at?: string;
  card_id?: string | null;
  card_name?: string | null;
  completed?: boolean;
}): Promise<PomodoroSession> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `INSERT INTO pomodoro_sessions
          (type, duration_min, started_at, finished_at, card_id, card_name, completed)
          VALUES (?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')), ?, ?, ?)
          RETURNING id, type, duration_min, started_at, finished_at, card_id, card_name, completed`,
    args: [
      input.type,
      input.duration_min,
      input.started_at ?? null,
      input.finished_at ?? null,
      input.card_id ?? null,
      input.card_name ?? null,
      input.completed === false ? 0 : 1,
    ],
  });
  const row = r.rows[0];
  return {
    id: Number(row.id),
    type: row.type as "focus" | "short_break" | "long_break",
    duration_min: Number(row.duration_min),
    started_at: row.started_at as string,
    finished_at: row.finished_at as string,
    card_id: row.card_id as string | null,
    card_name: row.card_name as string | null,
    completed: Number(row.completed),
  };
}

export async function listPomodoroSessionsByCard(cardId: string): Promise<PomodoroSession[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT id, type, duration_min, started_at, finished_at, card_id, card_name, completed
          FROM pomodoro_sessions
          WHERE card_id = ?
          ORDER BY finished_at DESC`,
    args: [cardId],
  });
  return r.rows.map((row) => ({
    id: Number(row.id),
    type: row.type as PomodoroSession["type"],
    duration_min: Number(row.duration_min),
    started_at: row.started_at as string,
    finished_at: row.finished_at as string,
    card_id: row.card_id as string | null,
    card_name: row.card_name as string | null,
    completed: Number(row.completed),
  }));
}

export async function getPomodoroCountsByCard(): Promise<Map<string, { count: number; minutes: number }>> {
  await initDb();
  const c = db();
  const r = await c.execute(`
    SELECT card_id,
           COUNT(*) as count,
           COALESCE(SUM(CASE WHEN type='focus' THEN duration_min ELSE 0 END), 0) as minutes
    FROM pomodoro_sessions
    WHERE completed = 1 AND card_id IS NOT NULL
    GROUP BY card_id
  `);
  const m = new Map<string, { count: number; minutes: number }>();
  for (const row of r.rows) {
    m.set(row.card_id as string, {
      count: Number(row.count),
      minutes: Number(row.minutes),
    });
  }
  return m;
}

export async function listPomodoroSessions(limit = 20): Promise<PomodoroSession[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT id, type, duration_min, started_at, finished_at, card_id, card_name, completed
          FROM pomodoro_sessions
          ORDER BY finished_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return r.rows.map((row) => ({
    id: Number(row.id),
    type: row.type as PomodoroSession["type"],
    duration_min: Number(row.duration_min),
    started_at: row.started_at as string,
    finished_at: row.finished_at as string,
    card_id: row.card_id as string | null,
    card_name: row.card_name as string | null,
    completed: Number(row.completed),
  }));
}

export async function getPomodoroByDay(days: number): Promise<{ date: string; count: number }[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT date(finished_at) AS date, COUNT(*) AS count
          FROM pomodoro_sessions
          WHERE completed = 1 AND finished_at >= datetime('now', ?)
          GROUP BY date(finished_at)
          ORDER BY date ASC`,
    args: [`-${days} days`],
  });
  return r.rows.map((row) => ({ date: row.date as string, count: Number(row.count) }));
}

export type PomodoroStats = {
  totalSessions: number;
  totalFocusMin: number;
  todaySessions: number;
  todayFocusMin: number;
  weekSessions: number;
  weekFocusMin: number;
  longestDay: { date: string; sessions: number } | null;
  byDay: { date: string; sessions: number; focus_min: number }[];
};

export async function getPomodoroStats(): Promise<PomodoroStats> {
  await initDb();
  const c = db();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoDate(today);

  // Início da semana (segunda)
  const dayOfWeek = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  const weekStartIso = isoDate(weekStart);

  // Total geral
  const totalR = await c.execute(
    `SELECT
       COUNT(*) AS total_sessions,
       COALESCE(SUM(CASE WHEN type='focus' THEN duration_min ELSE 0 END), 0) AS total_focus_min
     FROM pomodoro_sessions WHERE completed = 1`,
  );
  const totalSessions = Number(totalR.rows[0]?.total_sessions ?? 0);
  const totalFocusMin = Number(totalR.rows[0]?.total_focus_min ?? 0);

  // Hoje
  const todayR = await c.execute({
    sql: `SELECT
            COUNT(*) AS sessions,
            COALESCE(SUM(CASE WHEN type='focus' THEN duration_min ELSE 0 END), 0) AS focus_min
          FROM pomodoro_sessions
          WHERE completed = 1 AND date(finished_at) = ?`,
    args: [todayIso],
  });
  const todaySessions = Number(todayR.rows[0]?.sessions ?? 0);
  const todayFocusMin = Number(todayR.rows[0]?.focus_min ?? 0);

  // Semana
  const weekR = await c.execute({
    sql: `SELECT
            COUNT(*) AS sessions,
            COALESCE(SUM(CASE WHEN type='focus' THEN duration_min ELSE 0 END), 0) AS focus_min
          FROM pomodoro_sessions
          WHERE completed = 1 AND date(finished_at) >= ?`,
    args: [weekStartIso],
  });
  const weekSessions = Number(weekR.rows[0]?.sessions ?? 0);
  const weekFocusMin = Number(weekR.rows[0]?.focus_min ?? 0);

  // Por dia (últimos 30 dias)
  const byDayR = await c.execute(
    `SELECT date(finished_at) AS date,
            COUNT(*) AS sessions,
            COALESCE(SUM(CASE WHEN type='focus' THEN duration_min ELSE 0 END), 0) AS focus_min
     FROM pomodoro_sessions
     WHERE completed = 1 AND finished_at >= datetime('now', '-30 days')
     GROUP BY date(finished_at)
     ORDER BY date ASC`,
  );
  const byDay = byDayR.rows.map((row) => ({
    date: row.date as string,
    sessions: Number(row.sessions),
    focus_min: Number(row.focus_min),
  }));

  // Melhor dia
  let longestDay: { date: string; sessions: number } | null = null;
  for (const d of byDay) {
    if (!longestDay || d.sessions > longestDay.sessions) {
      longestDay = { date: d.date, sessions: d.sessions };
    }
  }

  return {
    totalSessions,
    totalFocusMin,
    todaySessions,
    todayFocusMin,
    weekSessions,
    weekFocusMin,
    longestDay,
    byDay,
  };
}
