"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreVertical, Archive, Pencil } from "lucide-react";
import { KanbanCard } from "./kanban-card";
import type { TrelloListItem, TrelloCardItem } from "@/lib/integrations/trello-api";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  list,
  cards,
  pinnedIds,
  onAddCard,
  onOpenCard,
  onDeleteCard,
  onTogglePinCard,
  onRenameList,
  onArchiveList,
}: {
  list: TrelloListItem;
  cards: TrelloCardItem[];
  pinnedIds: Set<string>;
  onAddCard: (listId: string, name: string) => void;
  onOpenCard: (card: TrelloCardItem) => void;
  onDeleteCard: (cardId: string) => void;
  onTogglePinCard: (card: TrelloCardItem, currentlyPinned: boolean) => void;
  onRenameList: (listId: string, name: string) => void;
  onArchiveList: (listId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `list:${list.id}`,
    data: { type: "list", listId: list.id },
  });

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.name);
  const titleRef = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function commitNewCard() {
    const trimmed = draft.trim();
    if (trimmed) onAddCard(list.id, trimmed);
    setDraft("");
    setAdding(false);
  }

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== list.name) onRenameList(list.id, trimmed);
    else setTitleDraft(list.name);
    setEditingTitle(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-bg-subtle/60 transition-colors",
        isOver && "ring-2 ring-accent/60"
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              else if (e.key === "Escape") {
                setTitleDraft(list.name);
                setEditingTitle(false);
              }
            }}
            className="flex-1 rounded-md border border-accent/50 bg-bg-card px-2 py-1 text-sm font-semibold text-fg focus:outline-none"
          />
        ) : (
          <h3
            onClick={() => setEditingTitle(true)}
            className="flex-1 cursor-text truncate text-sm font-semibold text-fg"
          >
            {list.name}
          </h3>
        )}
        <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[11px] text-fg-muted">{cards.length}</span>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded p-1 text-fg-subtle hover:bg-bg-hover hover:text-fg"
            aria-label="Opções"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl">
              <button
                onClick={() => {
                  setEditingTitle(true);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-muted hover:bg-bg-hover hover:text-fg"
              >
                <Pencil className="h-3.5 w-3.5" />
                Renomear
              </button>
              <button
                onClick={() => {
                  if (confirm(`Arquivar lista "${list.name}"?`)) {
                    onArchiveList(list.id);
                  }
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-muted hover:bg-danger/20 hover:text-danger"
              >
                <Archive className="h-3.5 w-3.5" />
                Arquivar lista
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              pinned={pinnedIds.has(card.id)}
              onOpen={onOpenCard}
              onDelete={onDeleteCard}
              onTogglePin={onTogglePinCard}
            />
          ))}
        </SortableContext>

        {adding ? (
          <div className="space-y-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitNewCard();
                } else if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              rows={2}
              placeholder="Título do card..."
              className="w-full resize-none rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={commitNewCard} className="btn-primary py-1.5 text-xs">
                Adicionar
              </button>
              <button
                onClick={() => {
                  setDraft("");
                  setAdding(false);
                }}
                className="text-xs text-fg-muted hover:text-fg"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg"
          >
            <Plus className="h-4 w-4" />
            Adicionar card
          </button>
        )}
      </div>
    </div>
  );
}
