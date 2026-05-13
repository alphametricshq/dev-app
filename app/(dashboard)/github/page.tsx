import { Topbar } from "@/components/topbar";
import { GithubHeatmap } from "@/components/dashboard/github-heatmap";
import { GithubMonthlyCalendar } from "@/components/github/monthly-calendar";
import { StatCard } from "@/components/dashboard/stat-card";
import { ComparisonCard } from "@/components/analytics/comparison-card";
import { WeekdayBars } from "@/components/analytics/weekday-bars";
import { MonthlyTrend } from "@/components/analytics/monthly-trend";
import { InsightsBox } from "@/components/analytics/insights-box";
import { getGithubContributions } from "@/lib/db/queries";
import { getGithubAnalytics } from "@/lib/analytics/github";
import { GitCommit, Flame, Calendar, TrendingUp, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GithubPage() {
  const [contribs, analytics] = await Promise.all([
    getGithubContributions(365),
    getGithubAnalytics(),
  ]);
  const total = analytics.total;
  const last30 = analytics.totalLast30;
  const last7 = analytics.totalLast7;
  const activeDays = contribs.filter((d) => d.count > 0).length;
  const last7Spark = contribs.slice(-7).map((d) => d.count);

  return (
    <>
      <Topbar title="GitHub" subtitle="Histórico e análise de desempenho" />
      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total (1 ano)" value={total.toLocaleString("pt-BR")} icon={GitCommit} sparkline={last7Spark} accent="github" />
          <StatCard label="Últimos 30 dias" value={last30} icon={TrendingUp} sparkline={last7Spark} accent="github" />
          <StatCard label="Últimos 7 dias" value={last7} icon={Flame} sparkline={last7Spark} accent="github" />
          <StatCard label="Dias ativos" value={`${activeDays}/365`} icon={Calendar} accent="github" />
        </div>

        <GithubHeatmap days={contribs} />

        <GithubMonthlyCalendar days={contribs} />

        {/* ===== Análise de desempenho ===== */}
        <section className="space-y-4">
          <header className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-fg">Análise de desempenho</h2>
          </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ComparisonCard label="Esta semana" comparison={analytics.weekly} unit="commits" accent="github" />
            <ComparisonCard label="Este mês" comparison={analytics.monthly} unit="commits" accent="github" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WeekdayBars
              data={analytics.weekdayDistribution}
              title="Padrão por dia da semana"
              subtitle="Média de contribuições"
              valueKey="avg"
              color="hsl(150 60% 50%)"
              bestWeekday={analytics.bestWeekday}
            />
            <MonthlyTrend data={analytics.monthlyTrend} />
          </div>

          <InsightsBox insights={analytics.insights} />
        </section>
      </div>
    </>
  );
}
