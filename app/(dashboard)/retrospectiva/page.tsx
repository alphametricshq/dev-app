import { Topbar } from "@/components/topbar";
import { WeeklyReviewClient } from "@/components/review/weekly-review-client";

export const dynamic = "force-dynamic";

export default function RetrospectivaPage() {
  return (
    <>
      <Topbar title="Retrospectiva" subtitle="Sua semana em números" />
      <div className="px-8 py-6">
        <WeeklyReviewClient />
      </div>
    </>
  );
}
