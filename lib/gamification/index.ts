import { getGithubContributions } from "@/lib/db/queries";
import { listHabitsWithStats } from "@/lib/db/habits-queries";
import { getPomodoroStats } from "@/lib/db/pomodoro-queries";
import { localIsoDate } from "@/lib/local-date";
import { computeXp, levelFromXp, levelTitle } from "./level";
import { evaluateBadges, type BadgeStatus } from "./badges";
import { computeGoals, type GoalProgress } from "./goals";

export type GamificationSummary = {
  xp: number;
  level: number;
  levelTitle: string;
  xpInLevel: number;
  xpForNextLevel: number;
  progressPct: number;
  badges: BadgeStatus[];
  unlockedBadges: number;
  totalBadges: number;
  goals: GoalProgress[];
  currentStreak: number;
  longestStreak: number;
};

function computeStreaks(contribs: { date: string; count: number }[]): {
  current: number;
  longest: number;
} {
  if (contribs.length === 0) return { current: 0, longest: 0 };
  const map = new Map(contribs.map((c) => [c.date, c.count]));
  const sorted = [...contribs].sort((a, b) => a.date.localeCompare(b.date));

  let longest = 0;
  let run = 0;
  for (const day of sorted) {
    if ((day.count ?? 0) > 0) {
      run++;
      if (run > longest) longest = run;
    } else run = 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = localIsoDate(today);
  const startOffset = (map.get(todayIso) ?? 0) > 0 ? 0 : 1;
  let current = 0;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = localIsoDate(d);
    if ((map.get(iso) ?? 0) > 0) current++;
    else break;
  }

  return { current, longest };
}

export async function getGamificationSummary(): Promise<GamificationSummary> {
  const [contribs, habits, pomodoroStats] = await Promise.all([
    getGithubContributions(365),
    listHabitsWithStats(),
    getPomodoroStats(),
  ]);

  const totalGithub = contribs.reduce((s, d) => s + d.count, 0);
  const activeDays = contribs.filter((d) => d.count > 0).length;
  const { current: currentStreak, longest: longestStreak } = computeStreaks(contribs);
  const bestHabitStreak = habits.reduce((max, h) => Math.max(max, h.longestStreak), 0);
  const bestPomodoroDay = pomodoroStats.longestDay?.sessions ?? 0;

  const xpBreakdown = computeXp({
    totalGithubContribs: totalGithub,
    activeDays,
    currentStreak,
    totalPomodoros: pomodoroStats.totalSessions,
  });
  const lvl = levelFromXp(xpBreakdown.total);
  const badges = evaluateBadges({
    contribs,
    totalGithub,
    currentStreak,
    longestStreak,
    activeDays,
    habitsCount: habits.length,
    bestHabitStreak,
    totalPomodoros: pomodoroStats.totalSessions,
    bestPomodoroDay,
  });
  const goals = await computeGoals({ contribs });

  return {
    xp: xpBreakdown.total,
    level: lvl.level,
    levelTitle: levelTitle(lvl.level),
    xpInLevel: lvl.xpInLevel,
    xpForNextLevel: lvl.xpForNextLevel,
    progressPct: lvl.progressPct,
    badges,
    unlockedBadges: badges.filter((b) => b.unlocked).length,
    totalBadges: badges.length,
    goals,
    currentStreak,
    longestStreak,
  };
}
