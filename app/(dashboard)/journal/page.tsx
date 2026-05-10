import { Topbar } from "@/components/topbar";
import { JournalPageClient } from "@/components/journal/journal-page-client";

export const dynamic = "force-dynamic";

export default function JournalPage() {
  return (
    <>
      <Topbar title="Journal" subtitle="Anota aprendizados, reflexões e ideias" />
      <div className="mx-auto max-w-5xl px-8 py-6">
        <JournalPageClient />
      </div>
    </>
  );
}
