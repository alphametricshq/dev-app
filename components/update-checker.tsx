"use client";

import { useEffect, useState } from "react";
import {
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UpdateInfo = { version: string; releaseNotes?: string | null };

type ElectronApi = {
  isElectron?: boolean;
  getAppVersion?: () => Promise<string>;
  checkForUpdates?: () => void;
  installUpdate?: () => void;
  onUpdateAvailable?: (cb: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloaded?: (cb: (info: UpdateInfo) => void) => () => void;
  onUpdateError?: (cb: (msg: string) => void) => () => void;
  onUpdateNotAvailable?: (cb: (info: { version: string | null }) => void) => () => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date" }
  | { kind: "available"; version: string }
  | { kind: "downloaded"; version: string }
  | { kind: "error"; message: string };

// Se em 15s nenhum evento chegou, assume timeout (sem rede ou repo privado).
const CHECK_TIMEOUT_MS = 15_000;

export function UpdateChecker() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const api = (window as unknown as { electron?: ElectronApi }).electron;
    if (!api?.isElectron) return;
    setIsElectron(true);
    api.getAppVersion?.().then(setCurrentVersion).catch(() => {});

    const offA = api.onUpdateAvailable?.((info) => {
      setStatus({ kind: "available", version: info.version });
    });
    const offD = api.onUpdateDownloaded?.((info) => {
      setStatus({ kind: "downloaded", version: info.version });
    });
    const offE = api.onUpdateError?.((msg) => {
      if (/404/.test(msg) || /releases\.atom/i.test(msg) || /authentication token/i.test(msg)) {
        // Repo privado / feed sem auth — interpreta como "tudo OK" no manual check
        setStatus({ kind: "up-to-date" });
        return;
      }
      setStatus({ kind: "error", message: msg });
    });
    const offN = api.onUpdateNotAvailable?.(() => {
      setStatus({ kind: "up-to-date" });
    });

    return () => {
      offA?.();
      offD?.();
      offE?.();
      offN?.();
    };
  }, []);

  useEffect(() => {
    if (status.kind !== "checking") return;
    const t = setTimeout(() => {
      setStatus((s) => (s.kind === "checking" ? { kind: "up-to-date" } : s));
    }, CHECK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [status.kind]);

  function handleCheck() {
    const api = (window as unknown as { electron?: ElectronApi }).electron;
    if (!api?.checkForUpdates) return;
    setStatus({ kind: "checking" });
    api.checkForUpdates();
  }

  function handleInstall() {
    const api = (window as unknown as { electron?: ElectronApi }).electron;
    api?.installUpdate?.();
  }

  if (!isElectron) {
    return (
      <div className="card flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-fg-subtle" />
        <div className="text-xs text-fg-muted">
          Auto-update só funciona quando rodando no Electron (app instalado).
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Atualizações</h2>
          <p className="text-xs text-fg-muted">
            {currentVersion ? (
              <>
                Versão instalada: <span className="font-mono text-fg">v{currentVersion}</span>
              </>
            ) : (
              "Verifique se há uma nova versão disponível."
            )}
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={status.kind === "checking"}
          className="btn-secondary py-1.5 text-xs"
        >
          {status.kind === "checking" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {status.kind === "checking" ? "Verificando..." : "Buscar atualizações"}
        </button>
      </header>

      {/* Estado */}
      {status.kind !== "idle" && status.kind !== "checking" && (
        <StatusRow status={status} onInstall={handleInstall} />
      )}

      <div className="mt-3 text-[11px] text-fg-subtle">
        O app também verifica automaticamente ao abrir e a cada 1 hora.
      </div>
    </div>
  );
}

function StatusRow({
  status,
  onInstall,
}: {
  status: Exclude<Status, { kind: "idle" } | { kind: "checking" }>;
  onInstall: () => void;
}) {
  if (status.kind === "up-to-date") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Você já está na versão mais recente.
      </div>
    );
  }
  if (status.kind === "available") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
        <Download className="h-3.5 w-3.5" />
        Versão{" "}
        <span className="font-mono font-semibold">v{status.version}</span> disponível — baixando em
        background...
      </div>
    );
  }
  if (status.kind === "downloaded") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>
          Versão{" "}
          <span className="font-mono font-semibold">v{status.version}</span> pronta pra instalar.
        </span>
        <button
          onClick={onInstall}
          className={cn(
            "ml-auto flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90",
          )}
        >
          <RefreshCw className="h-3 w-3" />
          Reiniciar e instalar
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="break-words">{status.message}</span>
    </div>
  );
}
