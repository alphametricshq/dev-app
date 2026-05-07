"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; msg: string }>(null);

  async function syncAll() {
    if (syncing) return;
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync/all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Sync falhou");
      setResult({ ok: true, msg: data.message ?? "Sincronizado" });
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setResult({ ok: false, msg });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg px-8 py-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {result && (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs",
              result.ok ? "text-success" : "text-danger"
            )}
          >
            {result.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {result.msg}
          </span>
        )}
        <button onClick={syncAll} disabled={syncing} className="btn-secondary">
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>
    </header>
  );
}
