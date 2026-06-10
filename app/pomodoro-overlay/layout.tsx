import { DialogHost } from "@/components/ui/dialog-host";

export default function PomodoroOverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { background: transparent !important; overflow: hidden; }
      `}</style>
      <div className="h-screen w-screen overflow-hidden bg-transparent">{children}</div>
      <DialogHost />
    </>
  );
}
