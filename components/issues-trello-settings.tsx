"use client";

import { useEffect, useState } from "react";
import { Github, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

type RecentLink = {
  issue_key: string;
  issue_url: string | null;
  issue_title: string | null;
  card_url: string | null;
  created_at: string;
};

export function IssuesTrelloSettings() {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [totalLinked, setTotalLinked] = useState(0);
  const [recent, setRecent] = useState<RecentLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/integrations/issues-trello");
      const data = await res.json();
      if (data?.ok) {
        setEnabled(data.enabled);
        setTotalLinked(data.totalLinked ?? 0);
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

  async function toggle() {
    if (busy) return;
    const next = !enabled;
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/issues-trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      setEnabled(next);
      if (next) {
        toast.success(
          "Integração ligada",
          data.baselined > 0
            ? `${data.baselined} issue(s) atual(is) marcadas como base. Só novas viram card.`
            : "Issues novas atribuídas a você virarão card no Trello.",
        );
      } else {
        toast.info("Integração desligada");
      }
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/issues", { method: "POST" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      toast.success(
        "Sincronizado",
        `${data.created} card(s) criado(s)${data.skipped ? `, ${data.skipped} já existiam` : ""}`,
      );
      load();
    } catch (e) {
      toast.error("Erro ao sincronizar", e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="card">
      <header className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Github className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Issues do GitHub → Trello</h2>
          <p className="text-xs text-fg-muted">
            Issues atribuídas a você viram card na lista &ldquo;To-do&rdquo; automaticamente
          </p>
        </div>
        <button
          onClick={toggle}
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

      {mounted && enabled && (
        <>
          <div className="mb-3 flex items-center gap-3 text-xs text-fg-muted">
            <span>
              <span className="font-mono text-fg">{totalLinked}</span> issue(s) já processada(s)
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
                  <span className="shrink-0 font-mono text-[10px] text-fg-subtle">{r.issue_key}</span>
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
          Requer GITHUB_TOKEN com escopo <code className="font-mono">repo</code> (pra issues em
          repos privados). Issues que já existem quando você liga não viram card — só as novas.
        </p>
      )}
    </div>
  );
}
