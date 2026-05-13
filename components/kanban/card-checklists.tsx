"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Plus, Trash2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { TrelloChecklist, TrelloCheckItem } from "@/lib/integrations/trello-api";

export function CardChecklists({ cardId }: { cardId: string }) {
  const [checklists, setChecklists] = useState<TrelloChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [autoFocusItemForId, setAutoFocusItemForId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/trello/cards/${cardId}/checklists`)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        if (d?.ok) setChecklists(d.checklists);
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [cardId]);

  async function refresh() {
    const r = await fetch(`/api/trello/cards/${cardId}/checklists`);
    const d = await r.json();
    if (d?.ok) setChecklists(d.checklists);
  }

  async function handleAddChecklist() {
    const name = draft.trim();
    if (!name) return;
    setDraft("");
    setAdding(false);
    try {
      const r = await fetch(`/api/trello/cards/${cardId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await r.json();
      if (!d?.ok) throw new Error(d?.error);
      // Marca o id da checklist nova pra abrir o input de item automaticamente
      if (d.checklist?.id) setAutoFocusItemForId(d.checklist.id);
      await refresh();
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : "Erro desconhecido");
    }
  }

  function requestDeleteChecklist(id: string, name: string) {
    setPendingDelete({ id, name });
  }

  async function confirmDeleteChecklist() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    setChecklists((prev) => prev.filter((c) => c.id !== target.id));
    try {
      const r = await fetch(`/api/trello/checklists/${target.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!d?.ok) throw new Error(d?.error);
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : "Erro desconhecido");
      refresh();
    }
  }

  async function handleAddItem(checklistId: string, name: string) {
    if (!name.trim()) return;
    try {
      const r = await fetch(`/api/trello/checklists/${checklistId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = await r.json();
      if (!d?.ok) throw new Error(d?.error);
      // optimistic add
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId ? { ...c, checkItems: [...c.checkItems, d.item] } : c,
        ),
      );
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : "Erro desconhecido");
    }
  }

  async function handleToggleItem(checklist: TrelloChecklist, item: TrelloCheckItem) {
    const nextState = item.state === "complete" ? "incomplete" : "complete";
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklist.id
          ? {
              ...c,
              checkItems: c.checkItems.map((i) =>
                i.id === item.id ? { ...i, state: nextState } : i,
              ),
            }
          : c,
      ),
    );
    try {
      const r = await fetch(`/api/trello/cards/${cardId}/checkitems/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
      const d = await r.json();
      if (!d?.ok) throw new Error(d?.error);
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : "Erro desconhecido");
      refresh();
    }
  }

  async function handleDeleteItem(checklistId: string, itemId: string) {
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId
          ? { ...c, checkItems: c.checkItems.filter((i) => i.id !== itemId) }
          : c,
      ),
    );
    try {
      const r = await fetch(`/api/trello/checklists/${checklistId}/items/${itemId}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!d?.ok) throw new Error(d?.error);
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : "Erro desconhecido");
      refresh();
    }
    // Garante que o foco volta pro modal (Electron pode perder após click em botão removido do DOM)
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || active === document.body) {
          (document.querySelector("[data-card-modal-body]") as HTMLElement | null)?.focus();
        }
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando checklists...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
          <CheckSquare className="h-3.5 w-3.5" />
          Checklists
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-fg-muted hover:bg-bg-hover hover:text-fg"
          >
            <Plus className="h-3 w-3" />
            Nova checklist
          </button>
        )}
      </div>

      {adding && (
        <div className="space-y-1.5 rounded-lg border border-accent/40 bg-accent/5 p-2">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              placeholder='Nome do grupo (ex: "Tasks", "Roadmap"...)'
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddChecklist();
                if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
              className="input flex-1 text-xs"
            />
            <button onClick={handleAddChecklist} className="btn-primary py-1.5 text-xs">
              Criar
            </button>
          </div>
          <p className="text-[10px] text-fg-subtle">
            Você cria um grupo aqui, depois adiciona os itens marcáveis dentro dele.
          </p>
        </div>
      )}

      {checklists.length === 0 && !adding && (
        <p className="py-2 text-center text-xs text-fg-subtle">Sem checklists</p>
      )}

      {checklists.map((cl) => {
        const total = cl.checkItems.length;
        const done = cl.checkItems.filter((i) => i.state === "complete").length;
        const pct = total > 0 ? (done / total) * 100 : 0;
        return (
          <ChecklistBlock
            key={cl.id}
            checklist={cl}
            done={done}
            total={total}
            pct={pct}
            startAddingItem={autoFocusItemForId === cl.id}
            onStartedAddingItem={() => setAutoFocusItemForId(null)}
            onAddItem={(name) => handleAddItem(cl.id, name)}
            onToggleItem={(item) => handleToggleItem(cl, item)}
            onDeleteItem={(itemId) => handleDeleteItem(cl.id, itemId)}
            onDeleteChecklist={() => requestDeleteChecklist(cl.id, cl.name)}
          />
        );
      })}

      {pendingDelete && (
        <ConfirmDeleteModal
          name={pendingDelete.name}
          onConfirm={confirmDeleteChecklist}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      } else if (e.key === "Enter") {
        e.stopPropagation();
        onConfirm();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel, onConfirm]);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-bg-card p-4 shadow-2xl">
        <h3 className="text-sm font-semibold text-fg">Apagar checklist?</h3>
        <p className="mt-1 text-xs text-fg-muted">
          &ldquo;{name}&rdquo; e todos os itens dentro serão apagados.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary py-1.5 text-xs">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="btn flex items-center gap-1.5 border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger hover:bg-danger/20"
          >
            <Trash2 className="h-3 w-3" />
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
}

function ChecklistBlock({
  checklist,
  done,
  total,
  pct,
  startAddingItem,
  onStartedAddingItem,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onDeleteChecklist,
}: {
  checklist: TrelloChecklist;
  done: number;
  total: number;
  pct: number;
  startAddingItem?: boolean;
  onStartedAddingItem?: () => void;
  onAddItem: (name: string) => void;
  onToggleItem: (item: TrelloCheckItem) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteChecklist: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  // Quando o pai indica que essa checklist foi recém-criada, já abre o input
  useEffect(() => {
    if (startAddingItem) {
      setAdding(true);
      onStartedAddingItem?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAddingItem]);

  function commit() {
    if (draft.trim()) {
      onAddItem(draft.trim());
      setDraft("");
      // Mantém o input aberto pra adicionar mais itens em sequência
    } else {
      setAdding(false);
    }
  }

  const items = [...checklist.checkItems].sort((a, b) => a.pos - b.pos);
  const isEmpty = items.length === 0;

  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-3">
      <header className="mb-2 flex items-center gap-2">
        <h4 className="flex-1 text-sm font-medium text-fg">{checklist.name}</h4>
        <span className="font-mono text-[10px] text-fg-subtle">
          {done}/{total}
        </span>
        <button
          onClick={onDeleteChecklist}
          className="rounded p-1 text-fg-subtle hover:bg-danger/20 hover:text-danger"
          aria-label="Apagar checklist"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </header>

      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-bg-hover">
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="group flex items-start gap-2 text-sm">
            <button
              onClick={() => onToggleItem(it)}
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                it.state === "complete"
                  ? "border-success bg-success text-white"
                  : "border-border hover:border-accent",
              )}
              aria-label={it.state === "complete" ? "Desmarcar" : "Marcar"}
            >
              {it.state === "complete" && <CheckSquare className="h-3 w-3" />}
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 break-words",
                it.state === "complete" ? "text-fg-subtle line-through" : "text-fg",
              )}
            >
              {it.name}
            </span>
            <button
              onClick={() => onDeleteItem(it.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Apagar item"
            >
              <X className="h-3 w-3 text-fg-subtle hover:text-danger" />
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="mt-2 space-y-1">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              placeholder="Novo item (Enter pra adicionar e continuar)"
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
              className="input flex-1 text-xs"
            />
            <button onClick={commit} className="btn-primary py-1.5 text-xs">
              +
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
              className="text-[11px] text-fg-muted hover:text-fg"
            >
              fim
            </button>
          </div>
          {isEmpty && (
            <p className="text-[10px] text-fg-subtle">
              Cada linha vira um item marcável. Enter adiciona e mantém o campo aberto.
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={cn(
            "mt-2 flex items-center gap-1 text-xs",
            isEmpty
              ? "rounded border border-dashed border-accent/40 px-2 py-1 text-accent hover:bg-accent/10"
              : "text-fg-muted hover:text-fg",
          )}
        >
          <Plus className="h-3 w-3" />
          {isEmpty ? "Adicionar primeiro item" : "Adicionar item"}
        </button>
      )}
    </div>
  );
}
