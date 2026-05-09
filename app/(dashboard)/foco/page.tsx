import { Topbar } from "@/components/topbar";
import { FocusPageClient } from "@/components/pomodoro/focus-page-client";

export const dynamic = "force-dynamic";

export default function FocoPage() {
  return (
    <>
      <Topbar title="Foco" subtitle="Pomodoro pra concentrar e ganhar XP" />
      <div className="px-8 py-6">
        <FocusPageClient />
      </div>
    </>
  );
}
