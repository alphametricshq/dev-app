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

const DISMISS_KEY = "update-banner-dismissed-v1";

function hashMessage(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

function isDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return JSON.parse(raw)[key] === true;
  } catch {
    return false;
  }
}

function persistDismiss(key: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[key] = true;
    localStorage.setItem(DISMISS_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

export function UpdateBanner() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electron) return;
    const offA = window.electron.onUpdateAvailable((info) => {
      const key = `available-${info.version}`;
      if (isDismissed(key)) return;
      setStatus({ kind: "available", version: info.version });
      setDismissed(false);
    });
    const offD = window.electron.onUpdateDownloaded((info) => {
      const key = `downloaded-${info.version}`;
      if (isDismissed(key)) return;
      setStatus({ kind: "downloaded", version: info.version });
      setDismissed(false);
    });
    const offE = window.electron.onUpdateError((msg) => {
      // Filtros adicionais no client: feed atom 404, repo privado
      if (/404/.test(msg) || /releases\.atom/i.test(msg) || /authentication token/i.test(msg)) {
        return;
      }
      const key = `error-${hashMessage(msg)}`;
      if (isDismissed(key)) return;
      setStatus({ kind: "error", message: msg });
      setDismissed(false);
    });
    return () => {
      offA();
      offD();
      offE();
    };
  }, []);

  function handleDismiss() {
    setDismissed(true);
    if (status.kind === "available") persistDismiss(`available-${status.version}`);
    else if (status.kind === "downloaded") persistDismiss(`downloaded-${status.version}`);
    else if (status.kind === "error") persistDismiss(`error-${hashMessage(status.message)}`);
  }

  if (status.kind === "idle" || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border-strong bg-bg-card p-4 shadow-2xl">
      {status.kind === "available" && (
        <Body
          icon={<Download className="h-4 w-4" />}
          accent="text-accent"
          title={`Versão ${status.version} disponível`}
          desc="Baixando em background..."
          onDismiss={handleDismiss}
        />
      )}
      {status.kind === "downloaded" && (
        <Body
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="text-success"
          title={`Versão ${status.version} pronta`}
          desc="Reinicie pra aplicar a atualização."
          onDismiss={handleDismiss}
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
          onDismiss={handleDismiss}
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
