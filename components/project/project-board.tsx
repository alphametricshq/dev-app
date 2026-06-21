"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  CalendarClock,
  FileText,
  Plus,
  X,
  LayoutGrid,
  CalendarRange,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { ProjectItem, ProjectMeta } from "@/lib/integrations/github-project";

const ACTIVE_TAB_KEY = "project-board-active-tab";

type TabId = string; // "all" | "this-week" | "user:<login>"

type Tab = {
  id: TabId;
  label: string;
  icon: typeof LayoutGrid;
  matches: (item: ProjectItem) => boolean;
};

function withinDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  return diffDays <= days; // inclui vencidos (diff < 0)
}

// Identifica clientes "internos" (Alphametrics, Interno) pra distinguir
// visualmente das demandas de cliente externo.
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

const PRIORITY_STYLE: Record<string, string> = {
  "🔴 P0 — urgente": "bg-danger/15 text-danger border-danger/30",
  "🟡 P1 — esta semana": "bg-warning/15 text-warning border-warning/30",
  "🟢 P2 — quando der": "bg-success/15 text-success border-success/30",
};

type BoardData = {
  meta: ProjectMeta;
  items: ProjectItem[];
  myLogin: string | null;
  org: string;
  projectNumber: number;
};

export function ProjectBoard() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [activeTabId, setActiveTabId] = useState<TabId>("user:me");
  const [activeItem, setActiveItem] = useState<ProjectItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewDemand, setShowNewDemand] = useState(false);
  const [clienteFilter, setClienteFilter] = useState<string | null>(null);
  const [prioridadeFilter, setPrioridadeFilter] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const draggingRef = useRef(false);
  const loadRef = useRef<(silent?: boolean) => void>(() => {});
  const modalOpenRef = useRef(false);
  modalOpenRef.current = showNewDemand;

  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_TAB_KEY);
    if (stored) setActiveTabId(stored);
    load();
  }, []);

  // Auto-refresh a cada 60s: o board é compartilhado com a equipe, então
  // mudanças de status feitas por outros aparecem sem precisar de F5.
  // Pula quando a janela tá oculta ou no meio de um drag.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden || draggingRef.current || modalOpenRef.current) return;
      loadRef.current(true);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  loadRef.current = load;

  async function load(silent = false) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
      setAuthError(false);
    }
    try {
      const res = await fetch("/api/project/board");
      const d = await res.json();
      if (!d?.ok) {
        if (!silent) setAuthError(!!d?.authError);
        throw new Error(d?.error ?? "Falha ao carregar o Project");
      }
      setData(d);
      setError(null);
      setAuthError(false);
    } catch (e) {
      // Refresh silencioso que falha não derruba o board (nem um modal aberto)
      // pra tela de erro — mantém os dados antigos e tenta de novo no próximo tick.
      if (!silent) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function selectTab(id: TabId) {
    setActiveTabId(id);
    localStorage.setItem(ACTIVE_TAB_KEY, id);
  }

  // Lista de tabs: fixas (Todas, Esta semana, Minhas) + uma por integrante
  // que aparece nos items (excluindo myLogin que já é "Minhas")
  const tabs: Tab[] = useMemo(() => {
    if (!data) return [];
    const me = data.myLogin?.toLowerCase();
    const result: Tab[] = [
      {
        id: "all",
        label: "Todas",
        icon: LayoutGrid,
        matches: () => true,
      },
      {
        id: "this-week",
        label: "Esta semana",
        icon: CalendarRange,
        matches: (it) => withinDays(it.deadline, 7),
      },
    ];
    if (data.myLogin) {
      result.push({
        id: "user:me",
        label: `Minhas`,
        icon: Users,
        matches: (it) =>
          it.assignees.some((a) => a.toLowerCase() === me) ||
          (it.isDraft && it.assignees.length === 0),
      });
    }
    // Coleta logins únicos que aparecem nos items, exceto myLogin
    const otherLogins = new Set<string>();
    for (const it of data.items) {
      for (const a of it.assignees) {
        const lower = a.toLowerCase();
        if (lower !== me) otherLogins.add(a);
      }
    }
    for (const login of Array.from(otherLogins).sort((a, b) => a.localeCompare(b))) {
      result.push({
        id: `user:${login}`,
        label: login,
        icon: Users,
        matches: (it) => it.assignees.some((a) => a.toLowerCase() === login.toLowerCase()),
      });
    }
    return result;
  }, [data]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // Itens após a tab ativa — base dos chips de stats e dos filtros de chip aplicados em cima
  const baseItems = useMemo(() => {
    if (!data) return [];
    const open = data.items.filter((it) => it.state !== "CLOSED");
    if (!activeTab) return open;
    return open.filter((it) => activeTab.matches(it));
  }, [data, activeTab]);

  const visibleItems = useMemo(() => {
    let items = baseItems;
    if (clienteFilter) items = items.filter((it) => it.cliente === clienteFilter);
    if (prioridadeFilter) items = items.filter((it) => it.prioridade === prioridadeFilter);
    return items;
  }, [baseItems, clienteFilter, prioridadeFilter]);

  // Distribuição por cliente e prioridade (pré-filtro de chip, pra todos os
  // chips continuarem visíveis enquanto um deles está ativo)
  const stats = useMemo(() => {
    const clientes = new Map<string, number>();
    const prioridades = new Map<string, number>();
    for (const it of baseItems) {
      if (it.cliente) clientes.set(it.cliente, (clientes.get(it.cliente) ?? 0) + 1);
      if (it.prioridade) prioridades.set(it.prioridade, (prioridades.get(it.prioridade) ?? 0) + 1);
    }
    // Filtro ativo continua aparecendo mesmo se zerar (ex.: ligou "Só minhas")
    if (clienteFilter && !clientes.has(clienteFilter)) clientes.set(clienteFilter, 0);
    if (prioridadeFilter && !prioridades.has(prioridadeFilter)) prioridades.set(prioridadeFilter, 0);
    const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1];
    return {
      clientes: Array.from(clientes.entries()).sort(byCount),
      prioridades: Array.from(prioridades.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [baseItems, clienteFilter, prioridadeFilter]);

  function itemsOf(statusName: string): ProjectItem[] {
    return visibleItems.filter((it) => it.status === statusName);
  }

  function handleDragStart(e: DragStartEvent) {
    draggingRef.current = true;
    const item = visibleItems.find((it) => it.itemId === String(e.active.id));
    if (item) setActiveItem(item);
  }

  async function handleDragEnd(e: DragEndEvent) {
    draggingRef.current = false;
    const { active, over } = e;
    setActiveItem(null);
    if (!over || !data) return;
    const itemId = String(active.id);
    const targetStatusName = String(over.id);
    const item = data.items.find((it) => it.itemId === itemId);
    if (!item || item.status === targetStatusName) return;
    const option = data.meta.statusOptions.find((o) => o.name === targetStatusName);
    if (!option) return;

    // Otimista
    const prevStatus = item.status;
    setData((prev) =>
      prev && {
        ...prev,
        items: prev.items.map((it) =>
          it.itemId === itemId ? { ...it, status: targetStatusName } : it,
        ),
      },
    );

    try {
      const res = await fetch("/api/project/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: data.meta.projectId,
          itemId,
          fieldId: data.meta.statusFieldId,
          optionId: option.id,
        }),
      });
      const d = await res.json();
      if (!d?.ok) throw new Error(d?.error ?? "Erro ao mover");
      toast.success("Movido", `"${item.title.slice(0, 50)}" → ${targetStatusName}`);
    } catch (err) {
      toast.error("Erro ao mover no GitHub", err instanceof Error ? err.message : String(err));
      setData((prev) =>
        prev && {
          ...prev,
          items: prev.items.map((it) =>
            it.itemId === itemId ? { ...it, status: prevStatus } : it,
          ),
        },
      );
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-fg-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando Project...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="h-8 w-8 text-danger" />
        <div className="max-w-xl">
          <h3 className="text-sm font-semibold text-fg">
            {authError ? "Sem acesso ao Project" : "Erro ao carregar"}
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-xs text-fg-muted">{error}</p>
          {authError && (
            <p className="mt-2 text-xs text-fg-subtle">
              Roda <code className="rounded bg-bg-hover px-1 font-mono">gh auth refresh -s project</code>{" "}
              no terminal, ou adiciona <code className="rounded bg-bg-hover px-1 font-mono">GITHUB_PROJECT_TOKEN</code>{" "}
              no .env.local.
            </p>
          )}
        </div>
        <button onClick={() => load()} className="btn-secondary py-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Tabs de visualização (estilo views do GitHub Project) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-subtle/60 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab?.id;
            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors",
                  active
                    ? "bg-bg-card text-fg shadow-sm ring-1 ring-border"
                    : "text-fg-muted hover:bg-bg-hover hover:text-fg",
                )}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-fg-subtle">
            {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
          </span>
          <a
            href={`https://github.com/orgs/${data.org}/projects/${data.projectNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir no GitHub
          </a>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary py-1 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            Atualizar
          </button>
          <button onClick={() => setShowNewDemand(true)} className="btn-primary py-1 text-xs">
            <Plus className="h-3 w-3" />
            Nova demanda
          </button>
        </div>
      </div>

      {(stats.clientes.length > 0 || stats.prioridades.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
          {stats.prioridades.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {stats.prioridades.map(([prio, count]) => {
                const active = prioridadeFilter === prio;
                return (
                  <button
                    key={prio}
                    onClick={() => setPrioridadeFilter(active ? null : prio)}
                    title={active ? "Limpar filtro" : `Filtrar por ${prio}`}
                    className={cn(
                      "rounded-full border px-2 py-0.5 transition-all hover:brightness-125",
                      PRIORITY_STYLE[prio] ?? "border-border bg-bg-subtle text-fg-muted",
                      active && "ring-2 ring-accent/70",
                      prioridadeFilter && !active && "opacity-40",
                    )}
                  >
                    {prio.replace(/—.*$/, "").trim()} <span className="font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          {stats.clientes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-fg-muted">
              {stats.clientes.map(([cliente, count]) => {
                const active = clienteFilter === cliente;
                return (
                  <button
                    key={cliente}
                    onClick={() => setClienteFilter(active ? null : cliente)}
                    title={active ? "Limpar filtro" : `Filtrar por ${cliente}`}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-accent transition-all",
                      active
                        ? "bg-accent/25 ring-1 ring-accent"
                        : "bg-accent/10 hover:bg-accent/20",
                      clienteFilter && !active && "opacity-40",
                    )}
                  >
                    {cliente} <span className="font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          {(clienteFilter || prioridadeFilter) && (
            <button
              onClick={() => {
                setClienteFilter(null);
                setPrioridadeFilter(null);
              }}
              className="flex items-center gap-1 text-fg-subtle hover:text-fg"
            >
              <X className="h-3 w-3" />
              limpar
            </button>
          )}
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
          {data.meta.statusOptions.map((opt) => (
            <StatusColumn key={opt.id} name={opt.name} items={itemsOf(opt.name)} />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? (
            <div className="rotate-2 cursor-grabbing">
              <ItemCard item={activeItem} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showNewDemand && (
        <NewDemandModal
          meta={data.meta}
          onClose={() => setShowNewDemand(false)}
          onCreated={() => {
            setShowNewDemand(false);
            load(true);
          }}
        />
      )}
    </div>
  );
}

function NewDemandModal({
  meta,
  onClose,
  onCreated,
}: {
  meta: ProjectMeta;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [prioridadeId, setPrioridadeId] = useState("");
  const [statusId, setStatusId] = useState(meta.statusOptions[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  // Só fecha pelo backdrop se o clique COMEÇOU nele (soltar uma seleção de
  // texto em cima do backdrop não pode descartar o que foi digitado)
  const backdropPointerDown = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);

    // Convenção do board: título com prefixo [Cliente]
    const clienteName = meta.clienteField?.options.find((o) => o.id === clienteId)?.name;
    const finalTitle =
      clienteName && !trimmed.startsWith("[") ? `[${clienteName}] ${trimmed}` : trimmed;

    const fields: { fieldId: string; optionId: string }[] = [];
    if (statusId) fields.push({ fieldId: meta.statusFieldId, optionId: statusId });
    if (clienteId && meta.clienteField) {
      fields.push({ fieldId: meta.clienteField.id, optionId: clienteId });
    }
    if (prioridadeId && meta.prioridadeField) {
      fields.push({ fieldId: meta.prioridadeField.id, optionId: prioridadeId });
    }

    try {
      const res = await fetch("/api/project/demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: meta.projectId,
          title: finalTitle,
          description: description.trim() || undefined,
          fields,
        }),
      });
      const d = await res.json();
      if (!d?.ok) {
        // Sucesso parcial: o draft existe, só os campos falharam. Fechar o
        // modal evita um retry que criaria draft duplicado no board da equipe.
        if (d?.itemId) {
          toast.info(
            "Demanda criada, mas sem todos os campos",
            "Ajusta Cliente/Prioridade/Status direto no GitHub.",
            8000,
          );
          onCreated();
          return;
        }
        throw new Error(d?.error ?? "Erro ao criar demanda");
      }
      toast.success("Demanda criada", `"${finalTitle.slice(0, 60)}" entrou no board como draft`);
      onCreated();
    } catch (err) {
      toast.error("Erro ao criar demanda", err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  function onFieldKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        backdropPointerDown.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropPointerDown.current && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Nova demanda</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onFieldKeyDown}
            placeholder="Título da demanda..."
            className="input"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={onFieldKeyDown}
            placeholder="Descrição (opcional)"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            {meta.clienteField && (
              <label className="space-y-1">
                <span className="text-[11px] text-fg-muted">Cliente</span>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-subtle px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                >
                  <option value="">—</option>
                  {meta.clienteField.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {meta.prioridadeField && (
              <label className="space-y-1">
                <span className="text-[11px] text-fg-muted">Prioridade</span>
                <select
                  value={prioridadeId}
                  onChange={(e) => setPrioridadeId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-subtle px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                >
                  <option value="">—</option>
                  {meta.prioridadeField.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="space-y-1">
              <span className="text-[11px] text-fg-muted">Status</span>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-subtle px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
              >
                {meta.statusOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-fg-subtle">
              Cria como <span className="text-fg">draft</span> no board · Ctrl+Enter
            </p>
            <button
              onClick={submit}
              disabled={!title.trim() || submitting}
              className="btn-primary py-1.5 text-xs"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {submitting ? "Criando..." : "Criar demanda"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusColumn({ name, items }: { name: string; items: ProjectItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: name });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-80 shrink-0 flex-col rounded-xl border border-border bg-bg-subtle/60 transition-colors",
        isOver && "ring-2 ring-accent/60",
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <h3 className="flex-1 truncate text-sm font-semibold text-fg">{name}</h3>
        <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[11px] text-fg-muted">
          {items.length}
        </span>
      </div>
      <div className="flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto p-3">
        {items.map((it) => (
          <DraggableItem key={it.itemId} item={it} />
        ))}
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 py-4 text-center text-[11px] text-fg-subtle">
            vazio
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableItem({ item }: { item: ProjectItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.itemId,
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-40")}>
      <ItemCard item={item} />
    </div>
  );
}

function ItemCard({ item, overlay = false }: { item: ProjectItem; overlay?: boolean }) {
  const prioStyle = item.prioridade ? PRIORITY_STYLE[item.prioridade] : null;
  const deadline = item.deadline ? parseDeadline(item.deadline) : null;
  const internal = isInternalCliente(item.cliente);

  return (
    <div
      className={cn(
        "relative cursor-grab touch-none rounded-lg border border-border bg-bg-card p-2.5 pl-3 text-sm shadow-sm transition-colors",
        !overlay && "hover:border-border-strong hover:bg-bg-hover",
        internal
          ? "border-l-2 border-l-warning"
          : item.cliente
            ? "border-l-2 border-l-accent"
            : "",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {(item.cliente || prioStyle) && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1">
              {item.cliente && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    internal
                      ? "bg-warning/15 text-warning"
                      : "bg-accent/10 text-accent",
                  )}
                  title={internal ? "Interno" : "Cliente externo"}
                >
                  {internal && <span className="mr-0.5">🏢</span>}
                  {item.cliente}
                </span>
              )}
              {item.prioridade && (
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                    prioStyle ?? "border-border bg-bg-subtle text-fg-muted",
                  )}
                >
                  {item.prioridade.replace(/—.*$/, "").trim()}
                </span>
              )}
            </div>
          )}
          <div className="break-words text-fg">{item.title}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-subtle">
            {item.isDraft ? (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                draft
              </span>
            ) : (
              item.repoFullName && (
                <span className="font-mono">
                  {item.repoFullName.split("/")[1]}#{item.number}
                </span>
              )
            )}
            {deadline && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  deadline.overdue ? "text-danger" : deadline.soon ? "text-warning" : "",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {deadline.label}
              </span>
            )}
            {item.assignees.length > 0 && (
              <span className="ml-auto truncate text-fg-muted">
                {item.assignees.join(", ")}
              </span>
            )}
          </div>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="shrink-0 rounded p-1 text-fg-subtle hover:bg-bg-hover hover:text-fg"
            aria-label="Abrir no GitHub"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function parseDeadline(iso: string): { label: string; overdue: boolean; soon: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return { label, overdue: diffDays < 0, soon: diffDays >= 0 && diffDays <= 3 };
}
