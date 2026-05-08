import { Topbar } from "@/components/topbar";
import { SettingsForm } from "@/components/settings-form";
import { getAutoSyncIntervalMinutes } from "@/lib/auto-sync";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const autoSyncMin = getAutoSyncIntervalMinutes();

  return (
    <>
      <Topbar title="Configurações" subtitle="Credenciais e integrações" />
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-6">
        <SettingsForm initialIntervalMin={autoSyncMin} />
      </div>
    </>
  );
}
