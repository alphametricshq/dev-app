"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SavedFilter = {
  id: string;
  name: string;
  labelIds: string[];
};

function storageKey(boardId: string) {
  return `kanban-saved-filters-${boardId}`;
}

function load(boardId: string): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(boardId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(boardId: string, filters: SavedFilter[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(boardId), JSON.stringify(filters));
  } catch {
    /* ignora */
  }
}

export function SavedFilters({
  boardId,
  currentLabelIds,
  onApply,
}: {
  boardId: string;
  currentLabelIds: string[];
  onApply: (labelIds: string[]) => void;
}) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);

  useEffect(() => {
    setFilters(load(boardId));
  }, [boardId]);

  function persist(next: SavedFilter[]) {
    setFilters(next);
    save(boardId, next);
  }

  function saveCurrent() {
    if (currentLabelIds.length === 0) return;
    const name = window.prompt("Nome do filtro:")?.trim();
    if (!name) return;
    const newFilter: SavedFilter = {
      id: `f-${Date.now()}`,
      name,
      labelIds: [...currentLabelIds],
    };
    persist([...filters, newFilter]);
  }

  function remove(id: string) {
    persist(filters.filter((f) => f.id !== id));
  }

  const isCurrentFilterSaved = filters.some(
    (f) =>
      f.labelIds.length === currentLabelIds.length &&
      f.labelIds.every((id) => currentLabelIds.includes(id)),
  );

  if (filters.length === 0 && currentLabelIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Bookmark className="h-3.5 w-3.5 text-fg-subtle" />
      {filters.map((f) => {
        const isActive =
          f.labelIds.length === currentLabelIds.length &&
          f.labelIds.every((id) => currentLabelIds.includes(id));
        return (
          <div
            key={f.id}
            className={cn(
              "group flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
              isActive
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-bg-subtle text-fg-muted hover:border-accent/40 hover:text-fg",
            )}
          >
            <button onClick={() => onApply(f.labelIds)} className="flex items-center gap-1">
              {f.name}
              <span className="text-[9px] opacity-60">({f.labelIds.length})</span>
            </button>
            <button
              onClick={() => remove(f.id)}
              className="rounded p-0.5 opacity-30 hover:bg-bg-hover hover:opacity-100"
              title="Remover filtro"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
      {currentLabelIds.length > 0 && !isCurrentFilterSaved && (
        <button
          onClick={saveCurrent}
          className="flex items-center gap-1 rounded-full border border-dashed border-accent/40 px-2 py-0.5 text-[11px] text-accent hover:bg-accent/10"
          title="Salvar combinação atual como filtro"
        >
          <BookmarkPlus className="h-3 w-3" />
          Salvar este
        </button>
      )}
    </div>
  );
}
