import {
  getGithubContributions,
  getTrelloCompletedByDay,
  getTrelloByBoard,
  getRecentTrelloTasks,
  getLastSyncs,
  getPinnedCards,
} from "@/lib/db/queries";
import { getGamificationSummary } from "@/lib/gamification";
import { getGithubAnalytics } from "@/lib/analytics/github";
import { getTrelloAnalytics } from "@/lib/analytics/trello";
import { StatCard } from "./stat-card";
import { GithubHeatmap } from "./github-heatmap";
import { TasksTimeseries } from "./tasks-timeseries";
import { BoardsBreakdown } from "./boards-breakdown";
import { RecentTasks } from "./recent-tasks";
import { SyncStatus } from "./sync-status";
import { DailyFocus } from "./daily-focus";
import { LevelCard } from "@/components/gamification/level-card";
import { ComparisonCard } from "@/components/analytics/comparison-card";
import { InsightsBox } from "@/components/analytics/insights-box";
import { GitCommit, CheckSquare, Flame, TrendingUp, BarChart3 } from "lucide-react";

export async function OverviewDashboard() {
  const [contribs, byDay, byBoard, recent, syncs, gami, ghAnalytics, trAnalytics, pinnedCards] = await Promise.all([
    getGithubContributions(365),
    getTrelloCompletedByDay(90),
    getTrelloByBoard(90),
    getRecentTrelloTasks(8),
    getLastSyncs(),
    getGamificationSummary(),
    getGithubAnalytics(),
    getTrelloAnalytics(),
    getPinnedCards(3),
  ]);
  const dailyGoal = gami.goals.find((g) => g.period === "daily")!;

  const combinedInsights = [...ghAnalytics.insights, ...trAnalytics.insights].slice(0, 5);

  const ghTotal = contribs.reduce((s, d) => s + d.count, 0);
  const ghLast30 = contribs
    .slice(-30)
    .reduce((s, d) => s + d.count, 0);
  const taskTotal = byDay.reduce((s, d) => s + d.count, 0);
  const streak = currentStreak(contribs);
  const avgPerDay = taskTotal > 0 ? (taskTotal / 90).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <DailyFocus dailyGoal={dailyGoal} pinnedCards={pinnedCards} />

      <LevelCard data={gami} compact />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Contribuições GitHub"
          value={ghTotal.toLocaleString("pt-BR")}
          hint="último ano"
          icon={GitCommit}
          accent="github"
        />
        <StatCard
          label="Últimos 30 dias"
          value={ghLast30.toLocaleString("pt-BR")}
          hint="contribuições"
          icon={TrendingUp}
          accent="github"
        />
        <StatCard
          label="Tarefas concluídas"
          value={taskTotal.toLocaleString("pt-BR")}
          hint={`média ${avgPerDay}/dia · 90 dias`}
          icon={CheckSquare}
          accent="trello"
        />
        <StatCard
          label="Streak atual"
          value={streak}
          hint={streak === 1 ? "dia" : "dias seguidos"}
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
            <a href="/github" className="hover:text-fg">Detalhes GitHub →</a>
            <a href="/trello" className="hover:text-fg">Detalhes Trello →</a>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ComparisonCard
            label="GitHub · 7 dias"
            comparison={ghAnalytics.weekly}
            unit="commits"
            accent="github"
          />
          <ComparisonCard
            label="Trello · 7 dias"
            comparison={trAnalytics.weekly}
            unit="tarefas"
            accent="trello"
          />
        </div>

        {combinedInsights.length > 0 && <InsightsBox insights={combinedInsights} />}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TasksTimeseries data={byDay} dailyTarget={dailyGoal.trello.target} />
        </div>
        <BoardsBreakdown data={byBoard} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentTasks tasks={recent} />
        <SyncStatus syncs={syncs} />
      </div>
    </div>
  );
}

function currentStreak(contribs: { date: string; count: number }[]): number {
  if (contribs.length === 0) return 0;
  const map = new Map(contribs.map((c) => [c.date, c.count]));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pula o dia atual se ainda não tem contribuição (não quebra streak)
  const todayIso = today.toISOString().slice(0, 10);
  const startOffset = (map.get(todayIso) ?? 0) > 0 ? 0 : 1;

  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if ((map.get(iso) ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}
