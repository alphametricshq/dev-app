"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToasts, dismissToast, type Toast as ToastT } from "@/lib/toast";

const TYPE_META = {
  success: { icon: CheckCircle2, accent: "border-success/40 bg-success/10 text-success" },
  error: { icon: AlertCircle, accent: "border-danger/40 bg-danger/10 text-danger" },
  info: { icon: Info, accent: "border-accent/40 bg-accent/10 text-accent" },
  warning: { icon: AlertTriangle, accent: "border-warning/40 bg-warning/10 text-warning" },
} as const;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return subscribeToasts(setToasts);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  );
}

function ToastItem({ toast }: { toast: ToastT }) {
  const meta = TYPE_META[toast.type];
  const Icon = meta.icon;
  const [exiting, setExiting] = useState(false);

  function handleDismiss() {
    setExiting(true);
    setTimeout(() => dismissToast(toast.id), 200);
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border bg-bg-card px-4 py-3 shadow-2xl backdrop-blur-sm",
        "transition-all duration-200",
        exiting ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100 animate-toast-in",
        meta.accent,
      )}
      role="status"
    >
      <div className={cn("mt-0.5 shrink-0", meta.accent.split(" ").find((c) => c.startsWith("text-")))}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-fg">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs text-fg-muted">{toast.description}</div>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded p-0.5 text-fg-subtle hover:bg-bg-hover hover:text-fg"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
