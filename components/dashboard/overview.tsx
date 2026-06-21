import Link from "next/link";
import { getGithubContributions, getLastSyncs } from "@/lib/db/queries";
import { getGamificationSummary } from "@/lib/gamification";
import { getGithubAnalytics } from "@/lib/analytics/github";
import { StatCard } from "./stat-card";
import { GithubHeatmap } from "./github-heatmap";
import { SyncStatus } from "./sync-status";
import { DailyFocus } from "./daily-focus";
import { LevelCard } from "@/components/gamification/level-card";
import { ComparisonCard } from "@/components/analytics/comparison-card";
import { InsightsBox } from "@/components/analytics/insights-box";
import { GoalCelebration } from "@/components/goal-celebration";
import { FirstRunBanner } from "./first-run-banner";
import { ActivityFeed } from "./activity-feed";
import { getRecentActivity } from "@/lib/activity-feed";
import { localIsoDate } from "@/lib/local-date";
import { GitCommit, Flame, TrendingUp, BarChart3 } from "lucide-react";

export async function OverviewDashboard() {
  const [contribs, syncs, gami, ghAnalytics, todayActivity] = await Promise.all([
    getGithubContributions(365),
    getLastSyncs(),
    getGamificationSummary(),
    getGithubAnalytics(),
    getRecentActivity(7, 40),
  ]);
  const dailyGoal = gami.goals.find((g) => g.period === "daily")!;

  const insights = ghAnalytics.insights.slice(0, 5);

  const ghTotal = contribs.reduce((s, d) => s + d.count, 0);
  const ghLast7Sum = sumLastDays(contribs, 0, 7);
  const ghPrev7Sum = sumLastDays(contribs, 7, 14);
  const ghLast30 = sumLastDays(contribs, 0, 30);
  const ghPrev30 = sumLastDays(contribs, 30, 60);
  const streak = currentStreak(contribs);
  const longestStreak = computeLongestStreak(contribs);
  const ghLast7 = contribs.slice(-7).map((d) => d.count);

  const ghLast7Trend = computeTrend(ghLast7Sum, ghPrev7Sum);
  const ghLast30Trend = computeTrend(ghLast30, ghPrev30);

  return (
    <div className="space-y-6">
      <FirstRunBanner />
      <GoalCelebration goals={gami.goals} level={gami.level} />
      <DailyFocus dailyGoal={dailyGoal} />

      <LevelCard data={gami} compact />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="GitHub · 7 dias"
          value={ghLast7Sum.toLocaleString("pt-BR")}
          hint={`vs ${ghPrev7Sum.toLocaleString("pt-BR")} na semana anterior`}
          icon={GitCommit}
          trend={ghLast7Trend}
          sparkline={ghLast7}
          accent="github"
        />
        <StatCard
          label="GitHub · 30 dias"
          value={ghLast30.toLocaleString("pt-BR")}
          hint={`${ghTotal.toLocaleString("pt-BR")} no ano todo`}
          icon={TrendingUp}
          trend={ghLast30Trend}
          sparkline={ghLast7}
          accent="github"
        />
        <StatCard
          label="Streak atual"
          value={streak}
          hint={
            streak > 0 && streak === longestStreak
              ? "novo recorde 🔥"
              : longestStreak > 0
                ? `recorde: ${longestStreak} dias`
                : streak === 1
                  ? "dia"
                  : "dias seguidos"
          }
          icon={Flame}
        />
      </div>

      <GithubHeatmap days={contribs} />

      {/* ===== Análise de desempenho (resumo) ===== */}
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-fg">Análise de desempenho</h2>
          </div>
          <div className="flex gap-3 text-[11px] text-fg-muted">
            <Link href="/github" className="hover:text-fg">Detalhes GitHub →</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          <ComparisonCard
            label="GitHub · 7 dias"
            comparison={ghAnalytics.weekly}
            unit="commits"
            accent="github"
          />
        </div>

        {insights.length > 0 && <InsightsBox insights={insights} />}
      </section>

      <ActivityFeed events={todayActivity} />

      <SyncStatus syncs={syncs} />
    </div>
  );
}

function sumLastDays(
  data: { date: string; count: number }[],
  startOffset: number,
  endOffsetExclusive: number,
): number {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let total = 0;
  for (let i = startOffset; i < endOffsetExclusive; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    total += map.get(localIsoDate(d)) ?? 0;
  }
  return total;
}

function computeTrend(current: number, previous: number): { value: number; label: string } | undefined {
  if (previous === 0) {
    if (current === 0) return undefined;
    return { value: 100, label: "vs anterior" };
  }
  const pct = ((current - previous) / previous) * 100;
  return { value: Math.round(pct), label: "vs anterior" };
}

function computeLongestStreak(contribs: { date: string; count: number }[]): number {
  if (contribs.length === 0) return 0;
  const sorted = [...contribs].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let run = 0;
  for (const c of sorted) {
    if (c.count > 0) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  return longest;
}

function currentStreak(contribs: { date: string; count: number }[]): number {
  if (contribs.length === 0) return 0;
  const map = new Map(contribs.map((c) => [c.date, c.count]));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayIso = localIsoDate(today);
  const startOffset = (map.get(todayIso) ?? 0) > 0 ? 0 : 1;

  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if ((map.get(localIsoDate(d)) ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}
