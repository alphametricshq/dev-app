"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [syncing, setSyncing] = useState(false);

  async function syncAll() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Sync falhou");
      toast.success("Sincronizado", data.message);
      setTimeout(() => location.reload(), 800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Falha no sync", msg);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg px-8 py-5">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-accent">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      <button onClick={syncAll} disabled={syncing} className="btn-secondary">
        <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
        {syncing ? "Sincronizando..." : "Sincronizar agora"}
      </button>
    </header>
  );
}
