import {
  getGithubContributions,
  getTrelloCompletedByDay,
  getTrelloByBoard,
  getRecentTrelloTasks,
  getLastSyncs,
} from "@/lib/db/queries";
import { getGamificationSummary } from "@/lib/gamification";
import { StatCard } from "./stat-card";
import { GithubHeatmap } from "./github-heatmap";
import { TasksTimeseries } from "./tasks-timeseries";
import { BoardsBreakdown } from "./boards-breakdown";
import { RecentTasks } from "./recent-tasks";
import { SyncStatus } from "./sync-status";
import { LevelCard } from "@/components/gamification/level-card";
import { GoalsList } from "@/components/gamification/goals-list";
import { GitCommit, CheckSquare, Flame, TrendingUp } from "lucide-react";

export async function OverviewDashboard() {
  const [contribs, byDay, byBoard, recent, syncs, gami] = await Promise.all([
    getGithubContributions(365),
    getTrelloCompletedByDay(90),
    getTrelloByBoard(90),
    getRecentTrelloTasks(8),
    getLastSyncs(),
    getGamificationSummary(),
  ]);

  const ghTotal = contribs.reduce((s, d) => s + d.count, 0);
  const ghLast30 = contribs
    .slice(-30)
    .reduce((s, d) => s + d.count, 0);
  const taskTotal = byDay.reduce((s, d) => s + d.count, 0);
  const streak = currentStreak(contribs);
  const avgPerDay = taskTotal > 0 ? (taskTotal / 90).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LevelCard data={gami} compact />
        </div>
        <div className="card">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
            Meta de hoje
          </div>
          <GoalsList goals={gami.goals.filter((g) => g.period === "daily")} />
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TasksTimeseries data={byDay} />
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
