import {
  getTrelloCompletedByDay,
  getTrelloCompletedByHour,
  getTrelloCompletedByWeekday,
  getTrelloByBoard,
} from "@/lib/db/queries";
import { localIsoDate } from "@/lib/local-date";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type Comparison = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
};

export type WeekdayBucket = { weekday: number; label: string; count: number };
export type HourBucket = { hour: number; label: string; count: number };
export type BoardBucket = { board_name: string; count: number };

export type TrelloAnalytics = {
  total90: number;
  totalLast7: number;
  totalLast30: number;
  velocityPerDay: number;
  velocityPerWeek: number;
  weekly: Comparison;
  monthly: Comparison;
  weekdayDistribution: WeekdayBucket[];
  hourDistribution: HourBucket[];
  topBoards: BoardBucket[];
  bestWeekday: WeekdayBucket | null;
  peakHour: HourBucket | null;
  insights: string[];
};

function isoDate(d: Date) {
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

export async function getTrelloAnalytics(): Promise<TrelloAnalytics> {
  const [byDay, byHour, byWeekday, byBoard] = await Promise.all([
    getTrelloCompletedByDay(90),
    getTrelloCompletedByHour(90),
    getTrelloCompletedByWeekday(90),
    getTrelloByBoard(90),
  ]);

  const total90 = byDay.reduce((s, d) => s + d.count, 0);
  const map = new Map(byDay.map((d) => [d.date, d.count]));

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

  // Distribuição por weekday (preenche zeros pra dias sem dados)
  const weekdayMap = new Map(byWeekday.map((d) => [d.weekday, d.count]));
  const weekdayDistribution: WeekdayBucket[] = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    count: weekdayMap.get(weekday) ?? 0,
  }));

  // Distribuição por hora
  const hourMap = new Map(byHour.map((d) => [d.hour, d.count]));
  const hourDistribution: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}h`,
    count: hourMap.get(hour) ?? 0,
  }));

  // Bests
  let bestWeekday: WeekdayBucket | null = null;
  for (const b of weekdayDistribution) {
    if (b.count > 0 && (!bestWeekday || b.count > bestWeekday.count)) bestWeekday = b;
  }
  let peakHour: HourBucket | null = null;
  for (const h of hourDistribution) {
    if (h.count > 0 && (!peakHour || h.count > peakHour.count)) peakHour = h;
  }

  const velocityPerDay = total90 / 90;
  const velocityPerWeek = velocityPerDay * 7;

  // Insights
  const insights: string[] = [];
  if (weekly.deltaPct != null) {
    if (weekly.deltaPct > 10) {
      insights.push(`Você fechou ${Math.round(weekly.deltaPct)}% mais tarefas que a semana passada 🎯`);
    } else if (weekly.deltaPct < -10) {
      insights.push(`Você fechou ${Math.abs(Math.round(weekly.deltaPct))}% menos tarefas que a semana passada.`);
    }
  }
  if (bestWeekday && bestWeekday.count > 0) {
    insights.push(`Seu dia mais produtivo no Trello é ${bestWeekday.label} (${bestWeekday.count} tarefas em 90 dias).`);
  }
  if (peakHour && peakHour.count > 0) {
    insights.push(`Hora pico: ${peakHour.label} concentra mais conclusões.`);
  }
  if (velocityPerWeek > 0) {
    insights.push(`Velocidade: ${velocityPerWeek.toFixed(1)} tarefas/semana em média.`);
  }
  if (byBoard.length > 0) {
    const top = byBoard[0];
    const share = total90 > 0 ? (top.count / total90) * 100 : 0;
    insights.push(`${top.board_name} concentra ${share.toFixed(0)}% das suas tarefas concluídas.`);
  }

  return {
    total90,
    totalLast7,
    totalLast30,
    velocityPerDay,
    velocityPerWeek,
    weekly,
    monthly,
    weekdayDistribution,
    hourDistribution,
    topBoards: byBoard,
    bestWeekday,
    peakHour,
    insights,
  };
}
