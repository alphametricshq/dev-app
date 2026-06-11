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
  User,
  CalendarClock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { ProjectItem, ProjectMeta } from "@/lib/integrations/github-project";

const ONLY_MINE_KEY = "project-board-only-mine";

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
  const [onlyMine, setOnlyMine] = useState(true);
  const [activeItem, setActiveItem] = useState<ProjectItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Refs pro auto-refresh não capturar estado velho nem atrapalhar um drag
  const draggingRef = useRef(false);
  const loadRef = useRef<(silent?: boolean) => void>(() => {});

  useEffect(() => {
    const stored = localStorage.getItem(ONLY_MINE_KEY);
    if (stored === "0") setOnlyMine(false);
    load();
  }, []);

  // Auto-refresh a cada 60s: o board é compartilhado com a equipe, então
  // mudanças de status feitas por outros aparecem sem precisar de F5.
  // Pula quando a janela tá oculta ou no meio de um drag.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden || draggingRef.current) return;
      loadRef.current(true);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  loadRef.current = load;

  async function load(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setAuthError(false);
    try {
      const res = await fetch("/api/project/board");
      const d = await res.json();
      if (!d?.ok) {
        setAuthError(!!d?.authError);
        throw new Error(d?.error ?? "Falha ao carregar o Project");
      }
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function toggleOnlyMine() {
    const next = !onlyMine;
    setOnlyMine(next);
    localStorage.setItem(ONLY_MINE_KEY, next ? "1" : "0");
  }

  const visibleItems = useMemo(() => {
    if (!data) return [];
    let items = data.items.filter((it) => it.state !== "CLOSED");
    if (onlyMine && data.myLogin) {
      const me = data.myLogin.toLowerCase();
      items = items.filter((it) => it.assignees.some((a) => a.toLowerCase() === me));
    }
    return items;
  }, [data, onlyMine]);

  // Distribuição por cliente e prioridade dos itens visíveis
  const stats = useMemo(() => {
    const clientes = new Map<string, number>();
    const prioridades = new Map<string, number>();
    for (const it of visibleItems) {
      if (it.cliente) clientes.set(it.cliente, (clientes.get(it.cliente) ?? 0) + 1);
      if (it.prioridade) prioridades.set(it.prioridade, (prioridades.get(it.prioridade) ?? 0) + 1);
    }
    const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1];
    return {
      clientes: Array.from(clientes.entries()).sort(byCount),
      prioridades: Array.from(prioridades.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [visibleItems]);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleOnlyMine}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              onlyMine
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-fg-muted hover:bg-bg-hover hover:text-fg",
            )}
          >
            <User className="h-3 w-3" />
            Só minhas
          </button>
          <span className="text-[11px] text-fg-subtle">
            {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
            {onlyMine && data.myLogin ? ` atribuídos a ${data.myLogin}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {(stats.clientes.length > 0 || stats.prioridades.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
          {stats.prioridades.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {stats.prioridades.map(([prio, count]) => (
                <span
                  key={prio}
                  className={cn(
                    "rounded-full border px-2 py-0.5",
                    PRIORITY_STYLE[prio] ?? "border-border bg-bg-subtle text-fg-muted",
                  )}
                >
                  {prio.replace(/—.*$/, "").trim()} <span className="font-mono">{count}</span>
                </span>
              ))}
            </div>
          )}
          {stats.clientes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-fg-muted">
              {stats.clientes.map(([cliente, count]) => (
                <span key={cliente} className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">
                  {cliente} <span className="font-mono">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
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

  return (
    <div
      className={cn(
        "cursor-grab touch-none rounded-lg border border-border bg-bg-card p-2.5 text-sm shadow-sm transition-colors",
        !overlay && "hover:border-border-strong hover:bg-bg-hover",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {(item.cliente || prioStyle) && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1">
              {item.cliente && (
                <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
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
