import { getGithubContributions } from "@/lib/db/queries";
import { listHabitsWithStats } from "@/lib/db/habits-queries";
import { XP_PER_GITHUB_CONTRIB, XP_PER_ACTIVE_DAY } from "@/lib/gamification/level";
import { localIsoDate } from "@/lib/local-date";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function isoDate(d: Date): string {
  return localIsoDate(d);
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

/**
 * Retorna inicio da semana ISO (segunda-feira) e fim (domingo) para weeksAgo.
 * weeksAgo=0 → semana atual
 * weeksAgo=1 → semana passada
 */
export function getWeekRange(weeksAgo = 0): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = (today.getDay() + 6) % 7; // seg=0
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek - weeksAgo * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatRange(start: Date, end: Date): string {
  const s = `${start.getDate()} ${MONTH_LABELS[start.getMonth()]}`;
  const e = `${end.getDate()} ${MONTH_LABELS[end.getMonth()]}`;
  return start.getMonth() === end.getMonth() ? `${start.getDate()}–${e}` : `${s} – ${e}`;
}

export type DailyEntry = {
  date: string;
  weekday: string;
  count: number;
};

export type Comparison = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
};

export type WeeklyReview = {
  weeksAgo: number;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  isCurrent: boolean;

  github: Comparison & {
    daily: DailyEntry[];
    bestDay: DailyEntry | null;
  };

  habits: {
    summary: {
      id: number;
      name: string;
      emoji: string;
      color: string;
      completed: number;
      target: number;
      pct: number;
    }[];
    totalCompletions: number;
    perfectDays: number;
  };

  xp: {
    earned: number;
    breakdown: { source: string; value: number }[];
  };

  newBadges: string[];

  highlights: {
    activeDays: number;
    totalActions: number;
    bestWeekday: string | null;
  };

  insights: string[];

  // Comparativo da semana atual vs média móvel das 4 semanas anteriores.
  vsAvg4Weeks: {
    github: { current: number; avg4w: number; deltaPct: number | null };
  };
};

function buildDaily(start: Date, end: Date, source: Map<string, number>): DailyEntry[] {
  const result: DailyEntry[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = isoDate(cursor);
    result.push({
      date: iso,
      weekday: WEEKDAY_LABELS[cursor.getDay()],
      count: source.get(iso) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function totalIn(daily: DailyEntry[]): number {
  return daily.reduce((s, d) => s + d.count, 0);
}

export async function getWeeklyReview(weeksAgo = 0): Promise<WeeklyReview> {
  const { start, end } = getWeekRange(weeksAgo);
  const prev = getWeekRange(weeksAgo + 1);

  const [contribs, habits] = await Promise.all([
    getGithubContributions(365),
    listHabitsWithStats(),
  ]);

  const ghMap = new Map(contribs.map((c) => [c.date, c.count]));

  const ghDaily = buildDaily(start, end, ghMap);
  const ghPrevDaily = buildDaily(prev.start, prev.end, ghMap);
  const ghTotal = totalIn(ghDaily);
  const ghPrev = totalIn(ghPrevDaily);

  function avgOf4Weeks(map: Map<string, number>): number {
    let sum = 0;
    for (let i = 1; i <= 4; i++) {
      const w = getWeekRange(weeksAgo + i);
      sum += totalIn(buildDaily(w.start, w.end, map));
    }
    return sum / 4;
  }
  const ghAvg4w = avgOf4Weeks(ghMap);

  const ghBest = ghDaily.reduce<DailyEntry | null>(
    (best, d) => (d.count > 0 && (!best || d.count > best.count) ? d : best),
    null,
  );

  // Habits: contar logs de cada habito dentro da janela
  const habitsSummary = habits.map((h) => {
    const logs = new Set(h.last30DaysLogs);
    let completed = 0;
    for (const d of ghDaily) {
      if (logs.has(d.date)) completed++;
    }
    const targetThisWeek = Math.min(h.target_per_week, 7);
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      completed,
      target: targetThisWeek,
      pct: targetThisWeek > 0 ? (completed / targetThisWeek) * 100 : 0,
    };
  });
  const totalCompletions = habitsSummary.reduce((s, h) => s + h.completed, 0);

  let perfectDays = 0;
  if (habits.length > 0) {
    for (const day of ghDaily) {
      const allDone = habits.every((h) => new Set(h.last30DaysLogs).has(day.date));
      if (allDone) perfectDays++;
    }
  }

  const activeDays = ghDaily.filter(
    (d) =>
      d.count > 0 ||
      habits.some((habit) => new Set(habit.last30DaysLogs).has(d.date)),
  ).length;

  const xpGh = ghTotal * XP_PER_GITHUB_CONTRIB;
  const xpDays = activeDays * XP_PER_ACTIVE_DAY;
  const xpEarned = xpGh + xpDays;

  // Heuristica de "novas badges": thresholds que cruzaram esta semana
  const newBadges: string[] = [];
  const ghTotalThisWeek = contribs
    .filter((c) => c.date <= isoDate(end))
    .reduce((s, d) => s + d.count, 0);
  const ghTotalPrevWeek = ghTotalThisWeek - ghTotal;
  for (const t of [
    { val: 1, title: "🌱 Primeiro passo" },
    { val: 100, title: "💯 Centenário (100 commits)" },
    { val: 500, title: "🚀 Meio-milheiro (500 commits)" },
    { val: 1000, title: "🏆 Mil-comiteiro (1k commits)" },
  ]) {
    if (ghTotalPrevWeek < t.val && ghTotalThisWeek >= t.val) newBadges.push(t.title);
  }

  const insights: string[] = [];
  if (ghTotal > 0 && ghPrev > 0) {
    const p = pct(ghTotal, ghPrev);
    if (p != null && p > 15) insights.push(`Você fez ${Math.round(p)}% mais commits que a semana passada 🚀`);
    else if (p != null && p < -15) insights.push(`Volume de commits caiu ${Math.abs(Math.round(p))}% vs semana anterior.`);
  }
  if (perfectDays > 0) {
    insights.push(`${perfectDays} dia${perfectDays === 1 ? "" : "s"} perfeito${perfectDays === 1 ? "" : "s"} (todos os hábitos cumpridos).`);
  }
  if (ghBest && ghBest.count > 0) {
    insights.push(`Melhor dia: ${ghBest.weekday} com ${ghBest.count} contribuições.`);
  }
  if (xpEarned > 0) {
    insights.push(`Ganhou ~${xpEarned.toLocaleString("pt-BR")} XP nessa semana.`);
  }

  return {
    weeksAgo,
    weekStart: isoDate(start),
    weekEnd: isoDate(end),
    weekLabel: formatRange(start, end),
    isCurrent: weeksAgo === 0,
    github: {
      current: ghTotal,
      previous: ghPrev,
      delta: ghTotal - ghPrev,
      deltaPct: pct(ghTotal, ghPrev),
      daily: ghDaily,
      bestDay: ghBest,
    },
    habits: {
      summary: habitsSummary,
      totalCompletions,
      perfectDays,
    },
    xp: {
      earned: xpEarned,
      breakdown: [
        { source: "GitHub", value: xpGh },
        { source: "Dias ativos", value: xpDays },
      ],
    },
    newBadges,
    highlights: {
      activeDays,
      totalActions: ghTotal,
      bestWeekday: ghBest?.weekday ?? null,
    },
    insights,
    vsAvg4Weeks: {
      github: { current: ghTotal, avg4w: ghAvg4w, deltaPct: pct(ghTotal, ghAvg4w) },
    },
  };
}
