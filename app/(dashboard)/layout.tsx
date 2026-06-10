import { Sidebar } from "@/components/sidebar";
import { UpdateBanner } from "@/components/update-banner";
import { Toaster } from "@/components/toast/toaster";
import { DialogHost } from "@/components/ui/dialog-host";
import { FloatingTimer } from "@/components/pomodoro/floating-timer";
import { CommandPalette } from "@/components/command/command-palette";
import { ShortcutsProvider } from "@/components/shortcuts-provider";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { ConfettiCanvas } from "@/components/confetti";
import { DailyInsightTrigger } from "@/components/daily-insight-trigger";
import { PomodoroElectronBridge } from "@/components/pomodoro/electron-bridge";
import { ShortcutsElectronBridge } from "@/components/shortcuts-electron-bridge";
import { StreakWarningTrigger } from "@/components/streak-warning-trigger";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <FloatingTimer />
      <UpdateBanner />
      <Toaster />
      <DialogHost />
      <CommandPalette />
      <ShortcutsProvider />
      <ShortcutsHelp />
      <ConfettiCanvas />
      <DailyInsightTrigger />
      <PomodoroElectronBridge />
      <ShortcutsElectronBridge />
      <StreakWarningTrigger />
    </div>
  );
}
