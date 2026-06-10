import { getGithubContributions, type GithubContribDay } from "@/lib/db/queries";
import { localIsoDate } from "@/lib/local-date";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type Comparison = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
};

export type WeekdayBucket = { weekday: number; label: string; count: number; avg: number };
export type MonthlyBucket = { month: string; count: number };

export type GithubAnalytics = {
  // totais
  total: number;
  totalLast30: number;
  totalLast7: number;
  // medias
  dailyAverage: number;
  activeRate: number; // % dias ativos
  // comparações temporais
  weekly: Comparison;
  monthly: Comparison;
  // padrões
  weekdayDistribution: WeekdayBucket[];
  monthlyTrend: MonthlyBucket[]; // últimos 6 meses
  bestDay: { date: string; count: number } | null;
  bestWeekday: WeekdayBucket | null;
  worstWeekday: WeekdayBucket | null;
  // streaks
  currentStreak: number;
  longestStreak: number;
  // insights textuais
  insights: string[];
};

function isoDate(d: Date): string {
  return localIsoDate(d);
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function sumRange(map: Map<string, number>, fromDays: number, toDaysExclusive: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let total = 0;
  for (let i = fromDays; i < toDaysExclusive; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    total += map.get(isoDate(d)) ?? 0;
  }
  return total;
}

function computeStreaks(contribs: GithubContribDay[]): { current: number; longest: number } {
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
  const todayIso = isoDate(today);
  const startOffset = (map.get(todayIso) ?? 0) > 0 ? 0 : 1;
  let current = 0;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if ((map.get(isoDate(d)) ?? 0) > 0) current++;
    else break;
  }
  return { current, longest };
}

export async function getGithubAnalytics(): Promise<GithubAnalytics> {
  const contribs = await getGithubContributions(365);
  const map = new Map(contribs.map((c) => [c.date, c.count]));
  const total = contribs.reduce((s, d) => s + d.count, 0);
  const activeDays = contribs.filter((d) => d.count > 0).length;

  const totalLast7 = sumRange(map, 0, 7);
  const totalLast30 = sumRange(map, 0, 30);
  const previousWeek = sumRange(map, 7, 14);
  const previousMonth = sumRange(map, 30, 60);

  const weekly: Comparison = {
    current: totalLast7,
    previous: previousWeek,
    delta: totalLast7 - previousWeek,
    deltaPct: pct(totalLast7, previousWeek),
  };
  const monthly: Comparison = {
    current: totalLast30,
    previous: previousMonth,
    delta: totalLast30 - previousMonth,
    deltaPct: pct(totalLast30, previousMonth),
  };

  // Distribuicao por weekday: contagem por dia da semana e media por ocorrencia
  const weekdayCount = [0, 0, 0, 0, 0, 0, 0];
  const weekdayDays = [0, 0, 0, 0, 0, 0, 0];
  for (const day of contribs) {
    const wd = new Date(day.date + "T12:00:00").getDay();
    weekdayCount[wd] += day.count;
    weekdayDays[wd] += 1;
  }
  const weekdayDistribution: WeekdayBucket[] = weekdayCount.map((count, weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    count,
    avg: weekdayDays[weekday] > 0 ? count / weekdayDays[weekday] : 0,
  }));

  let bestWeekday: WeekdayBucket | null = null;
  let worstWeekday: WeekdayBucket | null = null;
  for (const bucket of weekdayDistribution) {
    if (!bestWeekday || bucket.avg > bestWeekday.avg) bestWeekday = bucket;
    if (!worstWeekday || bucket.avg < worstWeekday.avg) worstWeekday = bucket;
  }

  // Distribuicao mensal (últimos 6 meses)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthlyTrend: MonthlyBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    let count = 0;
    for (const day of contribs) {
      const d = new Date(day.date + "T12:00:00");
      if (d >= monthStart && d < monthEnd) count += day.count;
    }
    const label = `${MONTH_LABELS[monthStart.getMonth()]}/${String(monthStart.getFullYear()).slice(2)}`;
    monthlyTrend.push({ month: label, count });
  }

  // Melhor dia individual
  let bestDay: { date: string; count: number } | null = null;
  for (const day of contribs) {
    if (!bestDay || day.count > bestDay.count) {
      bestDay = { date: day.date, count: day.count };
    }
  }
  if (bestDay && bestDay.count === 0) bestDay = null;

  const { current: currentStreak, longest: longestStreak } = computeStreaks(contribs);

  // Insights textuais
  const insights: string[] = [];
  if (weekly.deltaPct != null) {
    if (weekly.deltaPct > 10) {
      insights.push(`Você tá ${Math.round(weekly.deltaPct)}% mais produtivo que a semana passada 🚀`);
    } else if (weekly.deltaPct < -10) {
      insights.push(`Você tá ${Math.abs(Math.round(weekly.deltaPct))}% menos ativo que a semana passada — bora retomar?`);
    }
  }
  if (currentStreak >= 7) {
    insights.push(`${currentStreak} dias seguidos contribuindo. Mantém o ritmo! 🔥`);
  }
  if (bestWeekday && bestWeekday.avg > 0) {
    insights.push(`Seu melhor dia da semana é ${bestWeekday.label} (média de ${bestWeekday.avg.toFixed(1)} contribs).`);
  }
  if (bestDay) {
    const formatted = new Date(bestDay.date + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
    });
    insights.push(`Recorde diário: ${bestDay.count} contribuições em ${formatted}.`);
  }
  const dailyAverage = activeDays > 0 ? total / activeDays : 0;
  const activeRate = (activeDays / Math.max(1, contribs.length)) * 100;
  if (activeRate > 70) {
    insights.push(`Você foi ativo em ${activeRate.toFixed(0)}% dos dias do último ano. Consistência massa.`);
  }

  return {
    total,
    totalLast30,
    totalLast7,
    dailyAverage,
    activeRate,
    weekly,
    monthly,
    weekdayDistribution,
    monthlyTrend,
    bestDay,
    bestWeekday,
    worstWeekday,
    currentStreak,
    longestStreak,
    insights,
  };
}
