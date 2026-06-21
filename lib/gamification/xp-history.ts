import {
  XP_PER_GITHUB_CONTRIB,
  XP_PER_ACTIVE_DAY,
  XP_PER_POMODORO,
  levelFromXp,
} from "./level";

export type XpHistoryPoint = {
  date: string;
  xp: number;
  level: number;
  delta: number;
  github: number;
  pomodoros: number;
};

export type XpHistory = {
  points: XpHistoryPoint[];
  levelUps: { date: string; level: number; xp: number }[];
};

/**
 * Reconstrói histórico cumulativo de XP nos últimos `days` dias.
 * NÃO inclui XP de streak (computeXp soma streak * 15 só na visão atual,
 * histórico fica mais limpo sem essa duplicação).
 */
export function computeXpHistory(input: {
  contribs: { date: string; count: number }[];
  pomodorosByDay: { date: string; count: number }[];
  days?: number;
}): XpHistory {
  const days = input.days ?? 90;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ghMap = new Map(input.contribs.map((d) => [d.date, d.count]));
  const pomoMap = new Map(input.pomodorosByDay.map((d) => [d.date, d.count]));

  let cumXp = 0;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (days - 1));

  function preSum(map: Map<string, number>, perUnit: number): number {
    let total = 0;
    for (const [date, count] of map) {
      if (date < toIso(startDate)) total += count * perUnit;
    }
    return total;
  }
  function preSumActive(): number {
    const dayUnion = new Set<string>();
    for (const [d, c] of ghMap) if (c > 0 && d < toIso(startDate)) dayUnion.add(d);
    for (const [d, c] of pomoMap) if (c > 0 && d < toIso(startDate)) dayUnion.add(d);
    return dayUnion.size * XP_PER_ACTIVE_DAY;
  }
  cumXp += preSum(ghMap, XP_PER_GITHUB_CONTRIB);
  cumXp += preSum(pomoMap, XP_PER_POMODORO);
  cumXp += preSumActive();

  const points: XpHistoryPoint[] = [];
  const levelUps: { date: string; level: number; xp: number }[] = [];
  let prevLevel = levelFromXp(cumXp).level;

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const iso = toIso(d);
    const gh = ghMap.get(iso) ?? 0;
    const po = pomoMap.get(iso) ?? 0;
    const ghXp = gh * XP_PER_GITHUB_CONTRIB;
    const poXp = po * XP_PER_POMODORO;
    const activeXp = gh > 0 || po > 0 ? XP_PER_ACTIVE_DAY : 0;
    const delta = ghXp + poXp + activeXp;
    cumXp += delta;
    const lv = levelFromXp(cumXp).level;
    if (lv > prevLevel) {
      for (let l = prevLevel + 1; l <= lv; l++) {
        levelUps.push({ date: iso, level: l, xp: cumXp });
      }
      prevLevel = lv;
    }
    points.push({ date: iso, xp: cumXp, level: lv, delta, github: ghXp, pomodoros: poXp });
  }

  return { points, levelUps };
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
