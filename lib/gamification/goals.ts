import type { GithubContribDay } from "@/lib/db/queries";
import { getSetting, setSetting } from "@/lib/db/queries";

export const DEFAULT_GOALS = {
  daily: { github: 40, trello: 1 },
  weekly: { github: 200, trello: 5 },
  monthly: { github: 800, trello: 20 },
} as const;

export type GoalsConfig = {
  daily: { github: number; trello: number };
  weekly: { github: number; trello: number };
  monthly: { github: number; trello: number };
};

const SETTING_KEY = "goals";

export async function getGoalsConfig(): Promise<GoalsConfig> {
  const raw = await getSetting(SETTING_KEY);
  if (!raw) return clone(DEFAULT_GOALS);
  try {
    const parsed = JSON.parse(raw) as Partial<GoalsConfig>;
    return {
      daily: {
        github: parsed.daily?.github ?? DEFAULT_GOALS.daily.github,
        trello: parsed.daily?.trello ?? DEFAULT_GOALS.daily.trello,
      },
      weekly: {
        github: parsed.weekly?.github ?? DEFAULT_GOALS.weekly.github,
        trello: parsed.weekly?.trello ?? DEFAULT_GOALS.weekly.trello,
      },
      monthly: {
        github: parsed.monthly?.github ?? DEFAULT_GOALS.monthly.github,
        trello: parsed.monthly?.trello ?? DEFAULT_GOALS.monthly.trello,
      },
    };
  } catch {
    return clone(DEFAULT_GOALS);
  }
}

export async function setGoalsConfig(config: GoalsConfig): Promise<void> {
  await setSetting(SETTING_KEY, JSON.stringify(config));
}

function clone(g: typeof DEFAULT_GOALS): GoalsConfig {
  return JSON.parse(JSON.stringify(g));
}

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

export async function computeGoals(input: {
  contribs: GithubContribDay[];
  tasksByDay: { date: string; count: number }[];
}): Promise<GoalProgress[]> {
  const goals = await getGoalsConfig();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoDate(today);

  const weekStart = new Date(today);
  const dayOfWeek = (today.getDay() + 6) % 7; // seg=0
  weekStart.setDate(today.getDate() - dayOfWeek);

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
      github: { current: dayGh, target: goals.daily.github, pct: pct(dayGh, goals.daily.github) },
      trello: { current: dayTr, target: goals.daily.trello, pct: pct(dayTr, goals.daily.trello) },
      completed: dayGh >= goals.daily.github && dayTr >= goals.daily.trello,
    },
    {
      period: "weekly",
      label: "Esta semana",
      github: { current: weekGh, target: goals.weekly.github, pct: pct(weekGh, goals.weekly.github) },
      trello: { current: weekTr, target: goals.weekly.trello, pct: pct(weekTr, goals.weekly.trello) },
      completed: weekGh >= goals.weekly.github && weekTr >= goals.weekly.trello,
    },
    {
      period: "monthly",
      label: "Este mês",
      github: { current: monthGh, target: goals.monthly.github, pct: pct(monthGh, goals.monthly.github) },
      trello: { current: monthTr, target: goals.monthly.trello, pct: pct(monthTr, goals.monthly.trello) },
      completed: monthGh >= goals.monthly.github && monthTr >= goals.monthly.trello,
    },
  ];
}
