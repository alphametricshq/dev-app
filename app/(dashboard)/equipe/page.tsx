import { Topbar } from "@/components/topbar";
import { TeamView } from "@/components/team/team-view";

export const dynamic = "force-dynamic";

export default function EquipePage() {
  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Equipe"
        subtitle="Carga e atividade de cada integrante no GitHub Project"
      />
      <div className="flex min-h-0 flex-1 flex-col px-8 py-6">
        <TeamView />
      </div>
    </div>
  );
}
