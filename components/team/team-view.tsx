"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  ExternalLink,
  CalendarClock,
  Building2,
  AlertOctagon,
  UserX,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LastUpdated } from "@/components/last-updated";
import type { ProjectItem, ProjectMeta } from "@/lib/integrations/github-project";

type BoardData = {
  meta: ProjectMeta;
  items: ProjectItem[];
  myLogin: string | null;
  org: string;
  projectNumber: number;
};

const PRIORITY_STYLE: Record<string, string> = {
  "🔴 P0 — urgente": "bg-danger/15 text-danger border-danger/30",
  "🟡 P1 — esta semana": "bg-warning/15 text-warning border-warning/30",
  "🟢 P2 — quando der": "bg-success/15 text-success border-success/30",
};

function isInternalCliente(cliente: string | null): boolean {
  if (!cliente) return false;
  const lower = cliente.toLowerCase().trim();
  return (
    lower.includes("interno") ||
    lower.includes("alphametrics") ||
    lower.includes("alpha metrics") ||
    lower === "internal"
  );
}

export function TeamView() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  // Atalho R: refresh manual
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target && target.isContentEditable) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        load(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/project/board");
      const d = await res.json();
      if (!d?.ok) throw new Error(d?.error ?? "Falha ao carregar o Project");
      setData(d);
      setLastLoadedAt(Date.now());
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const byMember = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, ProjectItem[]>();
    for (const it of data.items) {
      if (it.state === "CLOSED") continue;
      for (const a of it.assignees) {
        const arr = map.get(a) ?? [];
        arr.push(it);
        map.set(a, arr);
      }
    }
    const list = Array.from(map.entries()).map(([login, items]) => ({ login, items }));
    // Yan primeiro, resto alfabético
    const me = data.myLogin?.toLowerCase();
    list.sort((a, b) => {
      if (a.login.toLowerCase() === me) return -1;
      if (b.login.toLowerCase() === me) return 1;
      return a.login.localeCompare(b.login);
    });
    return list;
  }, [data]);

  const summary = useMemo(() => {
    if (!data) {
      return { total: 0, unassigned: 0, overdue: 0, internal: 0, external: 0 };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let total = 0;
    let unassigned = 0;
    let overdue = 0;
    let internal = 0;
    let external = 0;
    for (const it of data.items) {
      if (it.state === "CLOSED") continue;
      total++;
      if (it.assignees.length === 0) unassigned++;
      if (it.deadline) {
        const d = new Date(it.deadline + "T00:00:00");
        if (d.getTime() < today.getTime()) overdue++;
      }
      if (it.cliente) {
        if (isInternalCliente(it.cliente)) internal++;
        else external++;
      }
    }
    return { total, unassigned, overdue, internal, external };
  }, [data]);

  const totalUnassigned = summary.unassigned;

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-fg-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando equipe...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <h3 className="text-sm font-semibold text-fg">Erro ao carregar</h3>
        <p className="text-xs text-fg-muted">{error}</p>
        <button onClick={() => load()} className="btn-secondary py-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[11px] text-fg-subtle">
          <Users className="h-3.5 w-3.5" />
          <span>
            {byMember.length} integrante{byMember.length === 1 ? "" : "s"} ativo
            {byMember.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LastUpdated at={lastLoadedAt} />
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary py-1 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards stats agregados */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5">
        <SummaryCard icon={Layers} label="Total" value={summary.total} tone="default" />
        <SummaryCard
          icon={Building2}
          label="Cliente externo"
          value={summary.external}
          tone="accent"
        />
        <SummaryCard
          icon={Building2}
          label="Interno"
          value={summary.internal}
          tone="warning"
        />
        <SummaryCard
          icon={AlertOctagon}
          label="Vencidos"
          value={summary.overdue}
          tone={summary.overdue > 0 ? "danger" : "default"}
        />
        <SummaryCard
          icon={UserX}
          label="Sem assignee"
          value={totalUnassigned}
          tone={totalUnassigned > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {byMember.map(({ login, items }) => (
          <MemberCard
            key={login}
            login={login}
            items={items}
            isMe={data.myLogin?.toLowerCase() === login.toLowerCase()}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "default" | "accent" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-fg-muted bg-bg-subtle",
    accent: "text-accent bg-accent/10",
    warning: "text-warning bg-warning/10",
    danger: "text-danger bg-danger/10",
  }[tone];
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-border px-3 py-2", toneClass)}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function MemberCard({
  login,
  items,
  isMe,
}: {
  login: string;
  items: ProjectItem[];
  isMe: boolean;
}) {
  const stats = useMemo(() => {
    const byStatus = new Map<string, number>();
    const byPrio = new Map<string, number>();
    let internal = 0;
    let external = 0;
    for (const it of items) {
      if (it.status) byStatus.set(it.status, (byStatus.get(it.status) ?? 0) + 1);
      if (it.prioridade) byPrio.set(it.prioridade, (byPrio.get(it.prioridade) ?? 0) + 1);
      if (it.cliente) {
        if (isInternalCliente(it.cliente)) internal++;
        else external++;
      }
    }
    return {
      total: items.length,
      byStatus: Array.from(byStatus.entries()).sort((a, b) => b[1] - a[1]),
      byPrio: Array.from(byPrio.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      internal,
      external,
    };
  }, [items]);

  const recent = items.slice(0, 5);

  return (
    <div className="card flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">
          {login.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={`https://github.com/${login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-fg hover:underline"
            >
              {login}
            </a>
            {isMe && (
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                você
              </span>
            )}
          </div>
          <div className="text-[11px] text-fg-muted">
            {stats.total} item{stats.total === 1 ? "" : "s"} aberto
            {stats.total === 1 ? "" : "s"}
          </div>
        </div>
      </header>

      {(stats.internal > 0 || stats.external > 0) && (
        <div className="flex gap-2 text-[11px]">
          {stats.external > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-accent">
              <Building2 className="h-2.5 w-2.5" />
              {stats.external} cliente
            </span>
          )}
          {stats.internal > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-warning">
              <Building2 className="h-2.5 w-2.5" />
              {stats.internal} interno
            </span>
          )}
        </div>
      )}

      {stats.byStatus.length > 0 && (
        <div className="space-y-1">
          {stats.byStatus.map(([status, count]) => (
            <div
              key={status}
              className="flex items-center justify-between text-[11px] text-fg-muted"
            >
              <span className="truncate">{status}</span>
              <span className="font-mono">{count}</span>
            </div>
          ))}
        </div>
      )}

      {stats.byPrio.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {stats.byPrio.map(([prio, count]) => (
            <span
              key={prio}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px]",
                PRIORITY_STYLE[prio] ?? "border-border bg-bg-subtle text-fg-muted",
              )}
            >
              {prio.replace(/—.*$/, "").trim()} <span className="font-mono">{count}</span>
            </span>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="border-t border-border pt-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-fg-subtle">
            Mais recentes
          </div>
          <ul className="space-y-1">
            {recent.map((it) => (
              <li key={it.itemId} className="flex items-start gap-2 text-[11px]">
                <span className="min-w-0 flex-1 truncate text-fg-muted">{it.title}</span>
                {it.deadline && (
                  <span className="flex shrink-0 items-center gap-0.5 text-fg-subtle">
                    <CalendarClock className="h-2.5 w-2.5" />
                    {new Date(it.deadline + "T00:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                )}
                {it.url && (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-fg-subtle hover:text-fg"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
