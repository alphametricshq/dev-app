import type { GithubContribDay } from "@/lib/db/queries";

// Metas default. No futuro pode virar configuravel via /settings.
export const GOALS = {
  daily: { github: 3, trello: 2 },
  weekly: { github: 15, trello: 7 },
  monthly: { github: 60, trello: 25 },
};

export type GoalProgress = {
  period: "daily" | "weekly" | "monthly";
  label: string;
  github: { current: number; target: number; pct: number };
  trello: { current: number; target: number; pct: number };
  completed: boolean;
};

function pct(current: number, target: number) {
  if (target === 0) return 100;
  return Math.min(100, (current / target) * 100);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function computeGoals(input: {
  contribs: GithubContribDay[];
  tasksByDay: { date: string; count: number }[];
}): GoalProgress[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoDate(today);

  // Inicio da semana (segunda)
  const weekStart = new Date(today);
  const dayOfWeek = (today.getDay() + 6) % 7; // seg=0
  weekStart.setDate(today.getDate() - dayOfWeek);

  // Inicio do mes
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const ghMap = new Map(input.contribs.map((d) => [d.date, d.count]));
  const trMap = new Map(input.tasksByDay.map((d) => [d.date, d.count]));

  function sumGh(from: Date) {
    let s = 0;
    const cursor = new Date(from);
    while (cursor <= today) {
      s += ghMap.get(isoDate(cursor)) ?? 0;
      cursor.setDate(cursor.getDate() + 1);
    }
    return s;
  }
  function sumTr(from: Date) {
    let s = 0;
    const cursor = new Date(from);
    while (cursor <= today) {
      s += trMap.get(isoDate(cursor)) ?? 0;
      cursor.setDate(cursor.getDate() + 1);
    }
    return s;
  }

  const dayGh = ghMap.get(todayIso) ?? 0;
  const dayTr = trMap.get(todayIso) ?? 0;
  const weekGh = sumGh(weekStart);
  const weekTr = sumTr(weekStart);
  const monthGh = sumGh(monthStart);
  const monthTr = sumTr(monthStart);

  return [
    {
      period: "daily",
      label: "Hoje",
      github: { current: dayGh, target: GOALS.daily.github, pct: pct(dayGh, GOALS.daily.github) },
      trello: { current: dayTr, target: GOALS.daily.trello, pct: pct(dayTr, GOALS.daily.trello) },
      completed: dayGh >= GOALS.daily.github && dayTr >= GOALS.daily.trello,
    },
    {
      period: "weekly",
      label: "Esta semana",
      github: { current: weekGh, target: GOALS.weekly.github, pct: pct(weekGh, GOALS.weekly.github) },
      trello: { current: weekTr, target: GOALS.weekly.trello, pct: pct(weekTr, GOALS.weekly.trello) },
      completed: weekGh >= GOALS.weekly.github && weekTr >= GOALS.weekly.trello,
    },
    {
      period: "monthly",
      label: "Este mês",
      github: { current: monthGh, target: GOALS.monthly.github, pct: pct(monthGh, GOALS.monthly.github) },
      trello: { current: monthTr, target: GOALS.monthly.trello, pct: pct(monthTr, GOALS.monthly.trello) },
      completed: monthGh >= GOALS.monthly.github && monthTr >= GOALS.monthly.trello,
    },
  ];
}
