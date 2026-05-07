import { Topbar } from "@/components/topbar";
import { TasksTimeseries } from "@/components/dashboard/tasks-timeseries";
import { BoardsBreakdown } from "@/components/dashboard/boards-breakdown";
import { RecentTasks } from "@/components/dashboard/recent-tasks";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  getTrelloCompletedByDay,
  getTrelloByBoard,
  getRecentTrelloTasks,
} from "@/lib/db/queries";
import { CheckSquare, Calendar, BarChart3, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrelloPage() {
  const [byDay, byBoard, recent] = await Promise.all([
    getTrelloCompletedByDay(90),
    getTrelloByBoard(90),
    getRecentTrelloTasks(20),
  ]);

  const total = byDay.reduce((s, d) => s + d.count, 0);
  const last7 = byDay.slice(-7).reduce((s, d) => s + d.count, 0);
  const activeDays = byDay.filter((d) => d.count > 0).length;
  const avg = total > 0 ? (total / 90).toFixed(1) : "0";

  return (
    <>
      <Topbar title="Trello" subtitle="Tarefas concluídas — 90 dias" />
      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total (90 dias)" value={total} icon={CheckSquare} accent="trello" />
          <StatCard label="Últimos 7 dias" value={last7} icon={Flame} accent="trello" />
          <StatCard label="Média / dia" value={avg} icon={BarChart3} accent="trello" />
          <StatCard label="Dias ativos" value={`${activeDays}/90`} icon={Calendar} accent="trello" />
        </div>

        <TasksTimeseries data={byDay} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BoardsBreakdown data={byBoard} />
          <RecentTasks tasks={recent} />
        </div>
      </div>
    </>
  );
}
