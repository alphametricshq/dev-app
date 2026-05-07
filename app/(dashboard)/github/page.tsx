import { Topbar } from "@/components/topbar";
import { GithubHeatmap } from "@/components/dashboard/github-heatmap";
import { StatCard } from "@/components/dashboard/stat-card";
import { getGithubContributions } from "@/lib/db/queries";
import { GitCommit, Flame, Calendar, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GithubPage() {
  const contribs = await getGithubContributions(365);
  const total = contribs.reduce((s, d) => s + d.count, 0);
  const last30 = contribs.slice(-30).reduce((s, d) => s + d.count, 0);
  const last7 = contribs.slice(-7).reduce((s, d) => s + d.count, 0);
  const activeDays = contribs.filter((d) => d.count > 0).length;

  return (
    <>
      <Topbar title="GitHub" subtitle="Histórico de contribuições" />
      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total (1 ano)" value={total.toLocaleString("pt-BR")} icon={GitCommit} accent="github" />
          <StatCard label="Últimos 30 dias" value={last30} icon={TrendingUp} accent="github" />
          <StatCard label="Últimos 7 dias" value={last7} icon={Flame} accent="github" />
          <StatCard label="Dias ativos" value={`${activeDays}/365`} icon={Calendar} accent="github" />
        </div>
        <GithubHeatmap days={contribs} />
      </div>
    </>
  );
}
