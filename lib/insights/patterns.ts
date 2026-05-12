import {
  getTrelloCompletedByHour,
  getTrelloCompletedByWeekday,
  getTrelloCompletedByDay,
  getGithubContributions,
} from "@/lib/db/queries";
import { getPomodoroByHour, getPomodoroByWeekday } from "@/lib/db/pomodoro-queries";
import { db, initDb } from "@/lib/db";

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type Pattern = {
  id: string;
  emoji: string;
  title: string;
  value: string;
  hint: string;
};

function bucketHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function hourLabel(hour: number): string {
  if (hour < 6) return "madrugada";
  if (hour < 12) return "manhã";
  if (hour < 18) return "tarde";
  return "noite";
}

async function habitLogsLast90(): Promise<Map<number, Set<string>>> {
  await initDb();
  const c = db();
  const r = await c.execute(
    `SELECT habit_id, date FROM habit_logs WHERE date >= date('now', '-90 days')`,
  );
  const m = new Map<number, Set<string>>();
  for (const row of r.rows) {
    const id = Number(row.habit_id);
    const date = row.date as string;
    if (!m.has(id)) m.set(id, new Set());
    m.get(id)!.add(date);
  }
  return m;
}

async function habitNames(): Promise<Map<number, { name: string; emoji: string }>> {
  await initDb();
  const c = db();
  const r = await c.execute(
    `SELECT id, name, emoji FROM habits WHERE archived = 0`,
  );
  const m = new Map<number, { name: string; emoji: string }>();
  for (const row of r.rows) {
    m.set(Number(row.id), {
      name: row.name as string,
      emoji: (row.emoji as string) ?? "✨",
    });
  }
  return m;
}

export async function computePatterns(): Promise<Pattern[]> {
  const [
    trelloByHour,
    trelloByWeekday,
    trelloByDay,
    contribsByDay,
    pomoByHour,
    pomoByWeekday,
    habits,
    logs,
  ] = await Promise.all([
    getTrelloCompletedByHour(90),
    getTrelloCompletedByWeekday(90),
    getTrelloCompletedByDay(90),
    getGithubContributions(90),
    getPomodoroByHour(90),
    getPomodoroByWeekday(90),
    habitNames(),
    habitLogsLast90(),
  ]);

  const patterns: Pattern[] = [];

  // ===== Hora pico combinada (tasks + pomodoros) =====
  const hourTotals = new Map<number, number>();
  for (const h of trelloByHour) hourTotals.set(h.hour, (hourTotals.get(h.hour) ?? 0) + h.count);
  for (const h of pomoByHour) hourTotals.set(h.hour, (hourTotals.get(h.hour) ?? 0) + h.count);
  let peakHour: number | null = null;
  let peakCount = 0;
  for (const [h, c] of hourTotals) {
    if (c > peakCount) {
      peakHour = h;
      peakCount = c;
    }
  }
  if (peakHour !== null && peakCount > 0) {
    patterns.push({
      id: "peak-hour",
      emoji: "⏰",
      title: "Sua hora de pico",
      value: bucketHour(peakHour),
      hint: `Maior concentração de tasks + pomodoros na ${hourLabel(peakHour)}`,
    });
  }

  // ===== Dia da semana mais produtivo (tasks + contribs + pomodoros) =====
  const weekdayTotals: number[] = Array(7).fill(0);
  for (const w of trelloByWeekday) weekdayTotals[w.weekday] += w.count;
  for (const w of pomoByWeekday) weekdayTotals[w.weekday] += w.count;
  for (const cd of contribsByDay) {
    const d = new Date(cd.date + "T00:00:00");
    weekdayTotals[d.getDay()] += cd.count;
  }
  let bestWeekday = -1;
  let bestWeekdayCount = 0;
  for (let i = 0; i < 7; i++) {
    if (weekdayTotals[i] > bestWeekdayCount) {
      bestWeekday = i;
      bestWeekdayCount = weekdayTotals[i];
    }
  }
  if (bestWeekday >= 0) {
    patterns.push({
      id: "best-weekday",
      emoji: "📅",
      title: "Seu melhor dia da semana",
      value: WEEKDAY_LABELS[bestWeekday],
      hint: `${bestWeekdayCount} ações registradas nesse dia em 90 dias`,
    });
  }

  // ===== Hábito mais consistente (top % nos últimos 30 dias) =====
  if (habits.size > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    type HabitRate = { id: number; rate: number; days: number };
    const rates: HabitRate[] = [];
    for (const [id, info] of habits) {
      const set = logs.get(id) ?? new Set<string>();
      let done = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        if (set.has(iso)) done++;
      }
      void info;
      rates.push({ id, rate: done / 30, days: done });
    }
    rates.sort((a, b) => b.rate - a.rate);
    const top = rates[0];
    if (top && top.days > 0) {
      const info = habits.get(top.id)!;
      patterns.push({
        id: "top-habit",
        emoji: info.emoji,
        title: "Hábito mais consistente",
        value: info.name,
        hint: `${top.days} de 30 dias · ${(top.rate * 100).toFixed(0)}% de consistência`,
      });
    }
  }

  // ===== Boost: hábito que mais correlaciona com tasks +contribs =====
  if (habits.size > 0 && trelloByDay.length + contribsByDay.length > 0) {
    const dayProd = new Map<string, number>();
    for (const t of trelloByDay) dayProd.set(t.date, (dayProd.get(t.date) ?? 0) + t.count);
    for (const c of contribsByDay) dayProd.set(c.date, (dayProd.get(c.date) ?? 0) + c.count);

    type Boost = { id: number; with: number; without: number; lift: number; sample: number };
    const boosts: Boost[] = [];
    for (const [id] of habits) {
      const set = logs.get(id) ?? new Set<string>();
      if (set.size < 5) continue; // amostra insuficiente
      let withSum = 0,
        withN = 0,
        woSum = 0,
        woN = 0;
      // Considera apenas dias que aparecem em dayProd (ignora dias sem qualquer atividade)
      for (const [date, prod] of dayProd) {
        if (set.has(date)) {
          withSum += prod;
          withN++;
        } else {
          woSum += prod;
          woN++;
        }
      }
      if (withN < 5 || woN < 5) continue;
      const withAvg = withSum / withN;
      const woAvg = woSum / woN;
      const lift = woAvg === 0 ? (withAvg > 0 ? 100 : 0) : ((withAvg - woAvg) / woAvg) * 100;
      boosts.push({ id, with: withAvg, without: woAvg, lift, sample: withN });
    }
    boosts.sort((a, b) => b.lift - a.lift);
    const topBoost = boosts[0];
    if (topBoost && topBoost.lift > 15) {
      const info = habits.get(topBoost.id)!;
      patterns.push({
        id: "habit-boost",
        emoji: "📈",
        title: "Dias com hábito = mais produção",
        value: `${info.emoji} ${info.name}`,
        hint: `+${Math.round(topBoost.lift)}% de atividade nos dias em que esse hábito tá feito`,
      });
    }
  }

  // ===== Streak de pomodoro nos últimos 14 dias =====
  // (omitido por enquanto pra não inflar)

  return patterns;
}
