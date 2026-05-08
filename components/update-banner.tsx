"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, CheckCircle2, AlertCircle, X } from "lucide-react";

type UpdateInfo = { version: string; releaseNotes?: string | null };

declare global {
  interface Window {
    electron?: {
      onUpdateAvailable: (cb: (info: UpdateInfo) => void) => () => void;
      onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => () => void;
      onUpdateError: (cb: (msg: string) => void) => () => void;
      installUpdate: () => void;
      checkForUpdates: () => void;
    };
  }
}

type Status =
  | { kind: "idle" }
  | { kind: "available"; version: string }
  | { kind: "downloaded"; version: string }
  | { kind: "error"; message: string };

export function UpdateBanner() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electron) return;
    const offA = window.electron.onUpdateAvailable((info) => {
      setStatus({ kind: "available", version: info.version });
      setDismissed(false);
    });
    const offD = window.electron.onUpdateDownloaded((info) => {
      setStatus({ kind: "downloaded", version: info.version });
      setDismissed(false);
    });
    const offE = window.electron.onUpdateError((msg) => {
      setStatus({ kind: "error", message: msg });
      setDismissed(false);
    });
    return () => {
      offA();
      offD();
      offE();
    };
  }, []);

  if (status.kind === "idle" || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border-strong bg-bg-card p-4 shadow-2xl">
      {status.kind === "available" && (
        <Body
          icon={<Download className="h-4 w-4" />}
          accent="text-accent"
          title={`Versão ${status.version} disponível`}
          desc="Baixando em background..."
          onDismiss={() => setDismissed(true)}
        />
      )}
      {status.kind === "downloaded" && (
        <Body
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="text-success"
          title={`Versão ${status.version} pronta`}
          desc="Reinicie pra aplicar a atualização."
          onDismiss={() => setDismissed(true)}
          action={
            <button
              onClick={() => window.electron?.installUpdate()}
              className="btn-primary mt-3 w-full justify-center py-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reiniciar e instalar
            </button>
          }
        />
      )}
      {status.kind === "error" && (
        <Body
          icon={<AlertCircle className="h-4 w-4" />}
          accent="text-danger"
          title="Erro ao verificar atualização"
          desc={status.message}
          onDismiss={() => setDismissed(true)}
        />
      )}
    </div>
  );
}

function Body({
  icon,
  accent,
  title,
  desc,
  onDismiss,
  action,
}: {
  icon: React.ReactNode;
  accent: string;
  title: string;
  desc: string;
  onDismiss: () => void;
  action?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${accent}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-fg">{title}</div>
          <div className="mt-0.5 text-xs text-fg-muted">{desc}</div>
        </div>
        <button
          onClick={onDismiss}
          className="rounded p-0.5 text-fg-subtle hover:bg-bg-hover hover:text-fg"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {action}
    </>
  );
}
