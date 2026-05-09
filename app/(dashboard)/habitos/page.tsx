import { Topbar } from "@/components/topbar";
import { HabitsPageClient } from "@/components/habits/habits-page-client";

export const dynamic = "force-dynamic";

export default function HabitsPage() {
  return (
    <>
      <Topbar title="Hábitos" subtitle="Construa consistência diária" />
      <div className="px-8 py-6">
        <HabitsPageClient />
      </div>
    </>
  );
}
