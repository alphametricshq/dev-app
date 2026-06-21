import type { GithubContribDay } from "@/lib/db/queries";
import { getSetting, setSetting } from "@/lib/db/queries";
import { localIsoDate } from "@/lib/local-date";

export const DEFAULT_GOALS = {
  daily: { github: 40 },
  weekly: { github: 200 },
  monthly: { github: 800 },
} as const;

export type GoalsConfig = {
  daily: { github: number };
  weekly: { github: number };
  monthly: { github: number };
};

const SETTING_KEY = "goals";

export async function getGoalsConfig(): Promise<GoalsConfig> {
  const raw = await getSetting(SETTING_KEY);
  if (!raw) return clone(DEFAULT_GOALS);
  try {
    const parsed = JSON.parse(raw) as Partial<GoalsConfig>;
    return {
      daily: { github: parsed.daily?.github ?? DEFAULT_GOALS.daily.github },
      weekly: { github: parsed.weekly?.github ?? DEFAULT_GOALS.weekly.github },
      monthly: { github: parsed.monthly?.github ?? DEFAULT_GOALS.monthly.github },
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
  completed: boolean;
};

function pct(current: number, target: number) {
  if (target === 0) return 100;
  return Math.min(100, (current / target) * 100);
}

function isoDate(d: Date) {
  return localIsoDate(d);
}

export async function computeGoals(input: {
  contribs: GithubContribDay[];
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

  function sumGh(from: Date) {
    let s = 0;
    const cursor = new Date(from);
    while (cursor <= today) {
      s += ghMap.get(isoDate(cursor)) ?? 0;
      cursor.setDate(cursor.getDate() + 1);
    }
    return s;
  }

  const dayGh = ghMap.get(todayIso) ?? 0;
  const weekGh = sumGh(weekStart);
  const monthGh = sumGh(monthStart);

  return [
    {
      period: "daily",
      label: "Hoje",
      github: { current: dayGh, target: goals.daily.github, pct: pct(dayGh, goals.daily.github) },
      completed: dayGh >= goals.daily.github,
    },
    {
      period: "weekly",
      label: "Esta semana",
      github: { current: weekGh, target: goals.weekly.github, pct: pct(weekGh, goals.weekly.github) },
      completed: weekGh >= goals.weekly.github,
    },
    {
      period: "monthly",
      label: "Este mês",
      github: { current: monthGh, target: goals.monthly.github, pct: pct(monthGh, goals.monthly.github) },
      completed: monthGh >= goals.monthly.github,
    },
  ];
}
