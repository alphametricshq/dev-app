import { Topbar } from "@/components/topbar";
import { SettingsForm } from "@/components/settings-form";
import { GoalsForm } from "@/components/goals-form";
import { BackupSection } from "@/components/backup-section";
import { ThemePicker } from "@/components/theme-picker";
import { SoundsToggle } from "@/components/sounds-toggle";
import { DesktopNotificationsToggle } from "@/components/desktop-notifications-toggle";
import { StreakWarningSettings } from "@/components/streak-warning-settings";
import { ShortcutsEditor } from "@/components/shortcuts-editor";
import { TemplatesManager } from "@/components/templates-manager";
import { IssuesTrelloSettings } from "@/components/issues-trello-settings";
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
        <DesktopNotificationsToggle />
        <StreakWarningSettings />
        <ShortcutsEditor />
        <GoalsForm />
        <IssuesTrelloSettings />
        <TemplatesManager />
        <SettingsForm initialIntervalMin={autoSyncMin} />
        <BackupSection />
      </div>
    </>
  );
}
