import { Topbar } from "@/components/topbar";
import { OverviewDashboard } from "@/components/dashboard/overview";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Topbar title="Visão geral" subtitle="Sua produtividade nos últimos 90 dias" />
      <div className="px-8 py-6">
        <OverviewDashboard />
      </div>
    </>
  );
}
