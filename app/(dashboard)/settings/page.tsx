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
import { getAutoSyncIntervalMinutes } from "@/lib/auto-sync";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "aparencia", label: "Aparência & feedback" },
  { id: "atalhos", label: "Atalhos" },
  { id: "metas", label: "Metas & templates" },
  { id: "credenciais", label: "Credenciais & sync" },
  { id: "dados", label: "Dados" },
];

export default function SettingsPage() {
  const autoSyncMin = getAutoSyncIntervalMinutes();

  return (
    <>
      <Topbar title="Configurações" subtitle="Credenciais, metas, backup e integrações" />
      <div className="mx-auto max-w-3xl space-y-10 px-8 py-6">
        {/* Mini-índice de âncoras */}
        <nav className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-border bg-bg-card px-3 py-1 text-[11px] text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <SettingsSection id="aparencia" title="Aparência & feedback">
          <ThemePicker />
          <SoundsToggle />
          <DesktopNotificationsToggle />
          <StreakWarningSettings />
        </SettingsSection>

        <SettingsSection id="atalhos" title="Atalhos">
          <ShortcutsEditor />
        </SettingsSection>

        <SettingsSection id="metas" title="Metas & templates">
          <GoalsForm />
          <TemplatesManager />
        </SettingsSection>

        <SettingsSection id="credenciais" title="Credenciais & sync">
          <SettingsForm initialIntervalMin={autoSyncMin} />
        </SettingsSection>

        <SettingsSection id="dados" title="Dados">
          <BackupSection />
        </SettingsSection>
      </div>
    </>
  );
}

function SettingsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="text-xs font-medium uppercase tracking-wider text-fg-muted">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
