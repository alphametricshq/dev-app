import { Sidebar } from "@/components/sidebar";
import { UpdateBanner } from "@/components/update-banner";
import { Toaster } from "@/components/toast/toaster";
import { FloatingTimer } from "@/components/pomodoro/floating-timer";
import { CommandPalette } from "@/components/command/command-palette";
import { ShortcutsProvider } from "@/components/shortcuts-provider";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { ConfettiCanvas } from "@/components/confetti";
import { DailyInsightTrigger } from "@/components/daily-insight-trigger";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <FloatingTimer />
      <UpdateBanner />
      <Toaster />
      <CommandPalette />
      <ShortcutsProvider />
      <ShortcutsHelp />
      <ConfettiCanvas />
      <DailyInsightTrigger />
    </div>
  );
}
