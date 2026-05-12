import { Topbar } from "@/components/topbar";
import { SettingsForm } from "@/components/settings-form";
import { GoalsForm } from "@/components/goals-form";
import { BackupSection } from "@/components/backup-section";
import { ThemePicker } from "@/components/theme-picker";
import { SoundsToggle } from "@/components/sounds-toggle";
import { TemplatesManager } from "@/components/templates-manager";
import { getAutoSyncIntervalMinutes } from "@/lib/auto-sync";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const autoSyncMin = getAutoSyncIntervalMinutes();

  return (
    <>
      <Topbar title="Configurações" subtitle="Credenciais, metas, backup e integrações" />
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-6">
        <ThemePicker />
        <SoundsToggle />
        <GoalsForm />
        <TemplatesManager />
        <SettingsForm initialIntervalMin={autoSyncMin} />
        <BackupSection />
      </div>
    </>
  );
}
