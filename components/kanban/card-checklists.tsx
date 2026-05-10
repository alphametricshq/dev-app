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
      await refresh();
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : "Erro desconhecido");
    }
  }

  async function handleDeleteChecklist(id: string, name: string) {
    if (!confirm(`Apagar checklist "${name}"?`)) return;
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    try {
      const r = await fetch(`/api/trello/checklists/${id}`, { method: "DELETE" });
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
            Adicionar
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 rounded-lg border border-accent/40 bg-accent/5 p-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            placeholder="Nome do checklist"
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
            OK
          </button>
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
            onAddItem={(name) => handleAddItem(cl.id, name)}
            onToggleItem={(item) => handleToggleItem(cl, item)}
            onDeleteItem={(itemId) => handleDeleteItem(cl.id, itemId)}
            onDeleteChecklist={() => handleDeleteChecklist(cl.id, cl.name)}
          />
        );
      })}
    </div>
  );
}

function ChecklistBlock({
  checklist,
  done,
  total,
  pct,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onDeleteChecklist,
}: {
  checklist: TrelloChecklist;
  done: number;
  total: number;
  pct: number;
  onAddItem: (name: string) => void;
  onToggleItem: (item: TrelloCheckItem) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteChecklist: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    if (draft.trim()) onAddItem(draft.trim());
    setDraft("");
    setAdding(false);
  }

  const items = [...checklist.checkItems].sort((a, b) => a.pos - b.pos);

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
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            placeholder="Novo item"
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
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
        >
          <Plus className="h-3 w-3" />
          Adicionar item
        </button>
      )}
    </div>
  );
}
