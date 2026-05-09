import { Sidebar } from "@/components/sidebar";
import { UpdateBanner } from "@/components/update-banner";
import { Toaster } from "@/components/toast/toaster";
import { FloatingTimer } from "@/components/pomodoro/floating-timer";
import { CommandPalette } from "@/components/command/command-palette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <FloatingTimer />
      <UpdateBanner />
      <Toaster />
      <CommandPalette />
    </div>
  );
}
