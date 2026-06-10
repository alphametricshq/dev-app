import { Topbar } from "@/components/topbar";
import { TasksTimeseries } from "@/components/dashboard/tasks-timeseries";
import { BoardsBreakdown } from "@/components/dashboard/boards-breakdown";
import { RecentTasks } from "@/components/dashboard/recent-tasks";
import { StatCard } from "@/components/dashboard/stat-card";
import { ComparisonCard } from "@/components/analytics/comparison-card";
import { WeekdayBars } from "@/components/analytics/weekday-bars";
import { HourBars } from "@/components/analytics/hour-bars";
import { InsightsBox } from "@/components/analytics/insights-box";
import {
  getTrelloCompletedByDay,
  getTrelloByBoard,
  getRecentTrelloTasks,
} from "@/lib/db/queries";
import { getTrelloAnalytics } from "@/lib/analytics/trello";
import { CheckSquare, Calendar, BarChart3, Flame, LineChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrelloPage() {
  const [byDay, byBoard, recent, analytics] = await Promise.all([
    getTrelloCompletedByDay(90),
    getTrelloByBoard(90),
    getRecentTrelloTasks(20),
    getTrelloAnalytics(),
  ]);

  const total = analytics.total90;
  const last7 = analytics.totalLast7;
  const activeDays = byDay.filter((d) => d.count > 0).length;
  const last7Spark = (() => {
    const map = new Map(byDay.map((d) => [d.date, d.count]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      result.push(map.get(d.toISOString().slice(0, 10)) ?? 0);
    }
    return result;
  })();

  return (
    <>
      <Topbar title="Trello" subtitle="Tarefas concluídas + análise de desempenho" />
      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total (90 dias)" value={total} icon={CheckSquare} sparkline={last7Spark} accent="trello" />
          <StatCard label="Últimos 7 dias" value={last7} icon={Flame} sparkline={last7Spark} accent="trello" />
          <StatCard label="Velocidade" value={`${analytics.velocityPerWeek.toFixed(1)}/sem`} icon={BarChart3} accent="trello" />
          <StatCard label="Dias ativos" value={`${activeDays}/90`} icon={Calendar} accent="trello" />
        </div>

        <TasksTimeseries data={byDay} />

        {/* ===== Análise de desempenho ===== */}
        <section className="space-y-4">
          <header className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-fg">Análise de desempenho</h2>
          </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ComparisonCard label="Esta semana" comparison={analytics.weekly} unit="tarefas" accent="trello" />
            <ComparisonCard label="Este mês" comparison={analytics.monthly} unit="tarefas" accent="trello" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WeekdayBars
              data={analytics.weekdayDistribution}
              title="Por dia da semana"
              subtitle="Tarefas concluídas (90 dias)"
              valueKey="count"
              color="hsl(40 90% 60%)"
              bestWeekday={analytics.bestWeekday}
            />
            <HourBars
              data={analytics.hourDistribution}
              peakHour={analytics.peakHour}
            />
          </div>

          <InsightsBox insights={analytics.insights} />
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BoardsBreakdown data={byBoard} />
          <RecentTasks tasks={recent} />
        </div>
      </div>
    </>
  );
}
