import { getGithubContributions } from "@/lib/db/queries";

export type StreakStatus = {
  currentStreak: number;
  todayContribs: number;
  shouldWarn: boolean;
};

import { localIsoDate } from "@/lib/local-date";

function isoDate(d: Date): string {
  return localIsoDate(d);
}

function computeCurrentStreak(contribs: { date: string; count: number }[]): number {
  const map = new Map(contribs.map((c) => [c.date, c.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoDate(today);
  const todayCount = map.get(todayIso) ?? 0;
  // Streak considera todos os dias até hoje. Se hoje tem 0, o streak ativo termina ontem.
  const startOff = todayCount > 0 ? 0 : 1;
  let streak = 0;
  for (let i = startOff; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const c = map.get(isoDate(d)) ?? 0;
    if (c > 0) streak++;
    else break;
  }
  return streak;
}

export async function getStreakWarningStatus(): Promise<StreakStatus> {
  const contribs = await getGithubContributions(365);
  const map = new Map(contribs.map((c) => [c.date, c.count]));
  const todayIso = isoDate(new Date());
  const todayContribs = map.get(todayIso) ?? 0;
  const currentStreak = computeCurrentStreak(contribs);
  // Warn: streak ativo (>= 1 baseado em ontem) e sem contribs hoje
  const shouldWarn = currentStreak > 0 && todayContribs === 0;
  return { currentStreak, todayContribs, shouldWarn };
}
