"use client";

import { useEffect, useState } from "react";
import { X, Search, Loader2, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Board = { id: string; name: string };
type Card = {
  id: string;
  name: string;
  idList: string;
  idBoard: string;
  closed: boolean;
};
type List = { id: string; name: string; closed: boolean };

const DONE_HINTS = ["done", "concluído", "concluido", "feito", "finalizado", "completo"];

export function CardSelector({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (card: { id: string; name: string }) => void;
}) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [search, setSearch] = useState("");
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    fetch("/api/trello/boards")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.boards)) {
          setBoards(data.boards);
          if (data.boards.length > 0) setSelectedBoardId(data.boards[0].id);
        }
      })
      .finally(() => setLoadingBoards(false));
  }, []);

  useEffect(() => {
    if (!selectedBoardId) return;
    setLoadingCards(true);
    fetch(`/api/trello/boards/${selectedBoardId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.board) {
          setCards(data.board.cards ?? []);
          setLists(data.board.lists ?? []);
        }
      })
      .finally(() => setLoadingCards(false));
  }, [selectedBoardId]);

  // Filtra cards que não estão em listas Done e não fechados
  const doneListIds = new Set(
    lists
      .filter((l) => DONE_HINTS.some((h) => l.name.toLowerCase().includes(h)))
      .map((l) => l.id),
  );
  const lower = search.toLowerCase();
  const filteredCards = cards
    .filter((c) => !c.closed)
    .filter((c) => !doneListIds.has(c.idList))
    .filter((c) => (lower ? c.name.toLowerCase().includes(lower) : true))
    .slice(0, 50);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-12 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl rounded-xl border border-border bg-bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <KanbanSquare className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-fg">Vincular card</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-fg-muted hover:bg-bg-hover hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          {loadingBoards ? (
            <div className="flex h-16 items-center justify-center text-fg-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando boards...
            </div>
          ) : (
            <>
              {boards.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBoardId(b.id)}
                      className={cn(
                        "rounded-full border px-3 py-0.5 text-xs transition-colors",
                        selectedBoardId === b.id
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-border text-fg-muted hover:bg-bg-hover hover:text-fg",
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar card..."
                  autoFocus
                  className="input pl-9"
                />
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loadingCards ? (
                  <div className="flex h-16 items-center justify-center text-fg-muted">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  </div>
                ) : filteredCards.length === 0 ? (
                  <p className="py-6 text-center text-sm text-fg-muted">
                    Nenhum card disponível
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {filteredCards.map((card) => {
                      const list = lists.find((l) => l.id === card.idList);
                      return (
                        <li key={card.id}>
                          <button
                            onClick={() => onSelect({ id: card.id, name: card.name })}
                            className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2 text-left text-sm transition-colors hover:border-accent/40 hover:bg-bg-hover"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-fg">{card.name}</div>
                              {list && (
                                <div className="text-[11px] text-fg-subtle">em {list.name}</div>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
