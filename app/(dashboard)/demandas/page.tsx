import { Topbar } from "@/components/topbar";
import { ProjectBoard } from "@/components/project/project-board";

export const dynamic = "force-dynamic";

export default function DemandasPage() {
  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Demandas"
        subtitle="GitHub Project da operação — arrastar entre colunas atualiza o status no GitHub"
      />
      <div className="flex min-h-0 flex-1 flex-col px-8 py-6">
        <ProjectBoard />
      </div>
    </div>
  );
}
