"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Download,
  CheckCircle2,
  ArrowUpCircle,
  AlertTriangle,
  Circle,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Box,
  Cpu,
  FileCode2,
  FolderOpen,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { DetectedComponent, SdkState, SdkComponentType } from "@/lib/sdk/types";

const TYPE_ICON: Record<SdkComponentType, typeof Box> = {
  "claude-skill": FileCode2,
  "claude-agent": Cpu,
  "claude-mcp": Box,
  "obsidian-vault": FolderOpen,
  "external-app": Wrench,
};

const TYPE_LABEL: Record<SdkComponentType, string> = {
  "claude-skill": "Skill",
  "claude-agent": "Agent",
  "claude-mcp": "MCP",
  "obsidian-vault": "Vault Obsidian",
  "external-app": "App externo",
};

type StatusMeta = {
  label: string;
  icon: typeof CheckCircle2;
  badgeClass: string;
  rowClass: string;
  defaultChecked: boolean;
  actionVerb: string;
};

function statusMeta(c: DetectedComponent): StatusMeta {
  const s = c.state;
  if (s.kind === "installed" && s.matchesRemote) {
    return {
      label: `instalado v${s.version}`,
      icon: CheckCircle2,
      badgeClass: "bg-success/15 text-success border-success/30",
      rowClass: "border-border",
      defaultChecked: false,
      actionVerb: "reinstalar",
    };
  }
  if (s.kind === "installed") {
    return {
      label: `instalado v${s.version}`,
      icon: CheckCircle2,
      badgeClass: "bg-success/15 text-success border-success/30",
      rowClass: "border-border",
      defaultChecked: false,
      actionVerb: "reinstalar",
    };
  }
  if (s.kind === "outdated") {
    return {
      label: `v${s.localVersion} → v${c.version}`,
      icon: ArrowUpCircle,
      badgeClass: "bg-warning/15 text-warning border-warning/30",
      rowClass: "border-warning/40",
      defaultChecked: true,
      actionVerb: "atualizar",
    };
  }
  if (s.kind === "modified") {
    return {
      label: "alterado localmente",
      icon: AlertTriangle,
      badgeClass: "bg-warning/15 text-warning border-warning/30",
      rowClass: "border-warning/40",
      defaultChecked: false,
      actionVerb: "sobrescrever",
    };
  }
  if (s.kind === "not-installed") {
    return {
      label: `instalar v${c.version}`,
      icon: Circle,
      badgeClass: "bg-accent/15 text-accent border-accent/30",
      rowClass: "border-border",
      defaultChecked: true,
      actionVerb: "instalar",
    };
  }
  return {
    label: "estado desconhecido",
    icon: HelpCircle,
    badgeClass: "bg-bg-subtle text-fg-muted border-border",
    rowClass: "border-border",
    defaultChecked: false,
    actionVerb: "tentar",
  };
}

export function SdkView() {
  const [state, setState] = useState<SdkState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selInitialized, setSelInitialized] = useState(false);

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/sdk/state");
      const d = await res.json();
      if (!d?.ok) throw new Error(d?.error ?? "Falha ao carregar estado do SDK");
      setState(d.state);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Marca defaults assim que carregar (componentes que deveriam ser instalados)
  useEffect(() => {
    if (!state || selInitialized) return;
    const initial = new Set<string>();
    for (const c of state.components) {
      if (statusMeta(c).defaultChecked || c.required) {
        initial.add(c.id);
      }
    }
    setSelected(initial);
    setSelInitialized(true);
  }, [state, selInitialized]);

  const grouped = useMemo(() => {
    const map = new Map<SdkComponentType, DetectedComponent[]>();
    for (const c of state?.components ?? []) {
      const arr = map.get(c.type) ?? [];
      arr.push(c);
      map.set(c.type, arr);
    }
    return Array.from(map.entries());
  }, [state]);

  const summary = useMemo(() => {
    if (!state) return { total: 0, ok: 0, outdated: 0, missing: 0 };
    let ok = 0;
    let outdated = 0;
    let missing = 0;
    for (const c of state.components) {
      if (c.state.kind === "installed") ok++;
      else if (c.state.kind === "outdated") outdated++;
      else if (c.state.kind === "not-installed") missing++;
    }
    return { total: state.components.length, ok, outdated, missing };
  }, [state]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [installing, setInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<
    | null
    | {
        kind: "installed" | "skipped" | "external-action-needed" | "error";
        component: string;
        message?: string;
        url?: string;
        error?: string;
        reason?: string;
      }[]
  >(null);

  async function handleInstall() {
    if (selected.size === 0 || installing) return;
    setInstalling(true);
    setInstallLog(null);
    try {
      const res = await fetch("/api/sdk/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error ?? "Erro ao instalar");
      setInstallLog(data.results);

      const ok = data.results.filter((r: { kind: string }) => r.kind === "installed").length;
      const errs = data.results.filter((r: { kind: string }) => r.kind === "error").length;
      const ext = data.results.filter(
        (r: { kind: string }) => r.kind === "external-action-needed",
      ).length;

      if (errs > 0) {
        toast.error("Instalação parcial", `${ok} OK · ${errs} erros · ${ext} ext.`);
      } else {
        toast.success(
          "Instalação concluída",
          `${ok} instalados · ${ext} app(s) externo(s) precisam ação manual`,
        );
      }
      await load(true);
    } catch (e) {
      toast.error("Falhou", e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center text-fg-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Escaneando seu ambiente...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <h3 className="text-sm font-semibold text-fg">Erro ao carregar SDK</h3>
        <p className="text-xs text-fg-muted">{error}</p>
        <button onClick={() => load()} className="btn-secondary py-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-4">
      {/* Cabecalho com sumario + acoes */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-fg">
              SDK v{state.manifest.version}
            </div>
            <div className="text-[11px] text-fg-muted">
              {summary.ok} em dia · {summary.outdated} desatualizados · {summary.missing} faltando
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Reescanear
          </button>
          <button
            onClick={handleInstall}
            disabled={selected.size === 0 || installing}
            className="btn-primary py-1.5 text-xs"
          >
            {installing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {installing ? "Instalando..." : `Instalar selecionados (${selected.size})`}
          </button>
        </div>
      </div>

      {/* Log da última instalação */}
      {installLog && installLog.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-subtle/50 px-3 py-3">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
            Resultado da instalação
          </div>
          <ul className="space-y-1 text-[12px]">
            {installLog.map((r, i) => {
              const Icon =
                r.kind === "installed"
                  ? CheckCircle2
                  : r.kind === "external-action-needed"
                    ? ExternalLink
                    : r.kind === "skipped"
                      ? Circle
                      : AlertCircle;
              const color =
                r.kind === "installed"
                  ? "text-success"
                  : r.kind === "external-action-needed"
                    ? "text-accent"
                    : r.kind === "skipped"
                      ? "text-fg-subtle"
                      : "text-danger";
              return (
                <li key={i} className={cn("flex items-start gap-2", color)}>
                  <Icon className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="font-mono text-fg-muted">{r.component}</span>
                  <span className="flex-1">
                    {r.kind === "installed" && (r.message ?? "instalado")}
                    {r.kind === "skipped" && `pulado: ${r.reason ?? ""}`}
                    {r.kind === "error" && `erro: ${r.error ?? ""}`}
                    {r.kind === "external-action-needed" && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        abrir página de download
                      </a>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Lista agrupada por tipo */}
      <div className="space-y-5">
        {grouped.map(([type, items]) => {
          const Icon = TYPE_ICON[type];
          const label = TYPE_LABEL[type];
          return (
            <section key={type}>
              <header className="mb-2 flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-fg-muted" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-fg-muted">
                  {label} ({items.length})
                </h3>
              </header>
              <ul className="space-y-1.5">
                {items.map((c) => (
                  <ComponentRow
                    key={c.id}
                    component={c}
                    checked={selected.has(c.id)}
                    onToggle={() => toggle(c.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ComponentRow({
  component,
  checked,
  onToggle,
}: {
  component: DetectedComponent;
  checked: boolean;
  onToggle: () => void;
}) {
  const meta = statusMeta(component);
  const StatusIcon = meta.icon;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-bg-subtle px-3 py-2.5 text-sm",
        meta.rowClass,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={component.required && component.state.kind !== "installed"}
        className="mt-1 h-4 w-4 cursor-pointer accent-accent"
        aria-label={`Selecionar ${component.name}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-fg">{component.name}</span>
          <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", meta.badgeClass)}>
            <StatusIcon className="h-3 w-3" />
            {meta.label}
          </span>
          {component.required && (
            <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-danger">
              obrigatório
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-fg-muted">{component.description}</p>
        {component.installUrl && component.state.kind === "not-installed" && (
          <a
            href={component.installUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Página de download
          </a>
        )}
      </div>
    </li>
  );
}
