"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const ALL_STATUSES = [
  "📥 Backlog",
  "📅 Esta Semana",
  "🚧 Em Andamento",
  "👀 Review",
  "✅ Entregue",
];

type Config = {
  enabled: boolean;
  org: string;
  projectNumber: number;
  statuses: string[];
};

type RecentLink = {
  issue_key: string;
  issue_title: string | null;
  card_url: string | null;
};

export function ProjectTrelloSettings() {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [recent, setRecent] = useState<RecentLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/integrations/project-trello");
      const data = await res.json();
      if (data?.ok) {
        setConfig(data.config);
        setRecent(data.recent ?? []);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    setMounted(true);
    load();
  }, []);

  async function save(next: Config, opts?: { silent?: boolean }) {
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/project-trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      setConfig(data.config);
      if (!opts?.silent) {
        if (next.enabled && data.baselined !== undefined && data.baselined >= 0 && !config?.enabled) {
          toast.success(
            "Integração ligada",
            data.baselined > 0
              ? `${data.baselined} item(ns) atual(is) marcados como base. Só novos viram card.`
              : "Itens novos do Project virarão card no Trello.",
          );
        }
      }
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleEnabled() {
    if (!config || busy) return;
    save({ ...config, enabled: !config.enabled });
  }

  function toggleStatus(status: string) {
    if (!config) return;
    const has = config.statuses.includes(status);
    const statuses = has
      ? config.statuses.filter((s) => s !== status)
      : [...config.statuses, status];
    if (statuses.length === 0) return; // pelo menos 1
    save({ ...config, statuses }, { silent: true });
  }

  async function syncNow() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/project", { method: "POST" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      toast.success("Sincronizado", `${data.created} card(s) criado(s)${data.skipped ? `, ${data.skipped} já existiam` : ""}`);
      load();
    } catch (e) {
      toast.error("Erro ao sincronizar", e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  const enabled = config?.enabled ?? false;

  return (
    <div className="card">
      <header className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <FolderKanban className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">GitHub Project → Trello</h2>
          <p className="text-xs text-fg-muted">
            Itens do Project atribuídos a você (nos status escolhidos) viram card na &ldquo;To-do&rdquo;
          </p>
        </div>
        <button
          onClick={toggleEnabled}
          disabled={!mounted || busy}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            enabled ? "bg-accent" : "bg-bg-hover",
          )}
          aria-label={enabled ? "Desligar" : "Ligar"}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </header>

      {mounted && config && enabled && (
        <>
          <div className="mb-3">
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-fg-muted">
              Status que viram card
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map((s) => {
                const active = config.statuses.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    disabled={busy}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                      active
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-fg-muted hover:bg-bg-hover hover:text-fg",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3 flex items-center gap-3 text-xs text-fg-muted">
            <span className="font-mono text-[11px]">
              {config.org} · Project #{config.projectNumber}
            </span>
            <button
              onClick={syncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-[11px] hover:bg-bg-hover disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Sincronizar agora
            </button>
          </div>

          {recent.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
                Últimos cards criados
              </div>
              {recent.map((r) => (
                <div
                  key={r.issue_key}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-bg-subtle px-3 py-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-fg" title={r.issue_title ?? r.issue_key}>
                    {r.issue_title ?? r.issue_key}
                  </span>
                  {r.card_url && (
                    <a href={r.card_url} target="_blank" rel="noopener noreferrer" className="text-fg-subtle hover:text-fg">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {mounted && !enabled && (
        <p className="text-[11px] text-fg-subtle">
          Lê o Project <span className="font-mono">alphametricshq/1</span> via API do GitHub. Filtra
          pelos itens atribuídos ao seu <code className="font-mono">GITHUB_USERNAME</code>. Itens já
          existentes ao ligar não viram card — só os novos.
        </p>
      )}
    </div>
  );
}
