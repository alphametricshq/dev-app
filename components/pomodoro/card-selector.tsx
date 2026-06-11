"use client";

import { useEffect, useState } from "react";
import { X, Search, Loader2, KanbanSquare, Star, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDoneListName } from "@/lib/trello-hints";

type Board = { id: string; name: string };
type Card = {
  id: string;
  name: string;
  idList: string;
  idBoard: string;
  closed: boolean;
};
type List = { id: string; name: string; closed: boolean };
type ProjectItem = {
  itemId: string;
  title: string;
  status: string | null;
  state: string | null;
  assignees: string[];
  cliente: string | null;
};
type Tab = "trello" | "demandas";

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
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [tab, setTab] = useState<Tab>("trello");
  const [demandas, setDemandas] = useState<ProjectItem[] | null>(null);
  const [loadingDemandas, setLoadingDemandas] = useState(false);
  const [demandasError, setDemandasError] = useState<string | null>(null);

  // Demandas carregam sob demanda (primeira vez que a aba abre)
  useEffect(() => {
    if (tab !== "demandas" || demandas !== null || loadingDemandas) return;
    setLoadingDemandas(true);
    fetch("/api/project/board")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok) throw new Error(d?.error ?? "Erro ao carregar o Project");
        const me = (d.myLogin as string | null)?.toLowerCase();
        const items = (d.items as ProjectItem[]).filter(
          (it) =>
            it.state !== "CLOSED" &&
            (!me || it.assignees.some((a) => a.toLowerCase() === me)),
        );
        setDemandas(items);
      })
      .catch((e) => setDemandasError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingDemandas(false));
  }, [tab, demandas, loadingDemandas]);

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

    fetch("/api/trello/cards/pinned")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.cards)) {
          setPinnedIds(new Set(data.cards.map((c: { card_id: string }) => c.card_id)));
        }
      })
      .catch(() => {});
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
    lists.filter((l) => isDoneListName(l.name)).map((l) => l.id),
  );
  const lower = search.toLowerCase();
  const filteredCards = cards
    .filter((c) => !c.closed)
    .filter((c) => !doneListIds.has(c.idList))
    .filter((c) => (lower ? c.name.toLowerCase().includes(lower) : true))
    .sort((a, b) => {
      // Fixados primeiro
      const aPin = pinnedIds.has(a.id) ? 1 : 0;
      const bPin = pinnedIds.has(b.id) ? 1 : 0;
      return bPin - aPin;
    })
    .slice(0, 50);

  const firstNonPinnedIdx = filteredCards.findIndex((c) => !pinnedIds.has(c.id));

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
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-full border border-border bg-bg-subtle p-0.5 text-xs">
              <button
                onClick={() => setTab("trello")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-colors",
                  tab === "trello" ? "bg-bg-card text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
                <KanbanSquare className="h-3 w-3" />
                Trello
              </button>
              <button
                onClick={() => setTab("demandas")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-colors",
                  tab === "demandas" ? "bg-bg-card text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
                <FolderKanban className="h-3 w-3" />
                Demandas
              </button>
            </div>
            <button onClick={onClose} className="rounded p-1 text-fg-muted hover:bg-bg-hover hover:text-fg">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {tab === "demandas" ? (
          <div className="space-y-3 px-5 py-4">
            {loadingDemandas ? (
              <div className="flex h-16 items-center justify-center text-fg-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando demandas...
              </div>
            ) : demandasError ? (
              <p className="py-4 text-center text-xs text-danger">{demandasError}</p>
            ) : !demandas || demandas.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">
                Nenhuma demanda aberta atribuída a você
              </p>
            ) : (
              <ul className="max-h-96 space-y-1 overflow-y-auto">
                {demandas.map((it) => (
                  <li key={it.itemId}>
                    <button
                      onClick={() => onSelect({ id: `project:${it.itemId}`, name: it.title })}
                      className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2 text-left text-sm transition-colors hover:border-accent/40 hover:bg-bg-hover"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-fg">{it.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-subtle">
                          {it.status && <span>{it.status}</span>}
                          {it.cliente && (
                            <span className="rounded bg-accent/10 px-1 py-0.5 text-[10px] font-semibold text-accent">
                              {it.cliente}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
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
                    {pinnedIds.size > 0 && filteredCards.some((c) => pinnedIds.has(c.id)) && (
                      <li className="flex items-center gap-1.5 px-1 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">
                        <Star className="h-3 w-3 fill-warning" />
                        Fixados
                      </li>
                    )}
                    {filteredCards.map((card, idx) => {
                      const list = lists.find((l) => l.id === card.idList);
                      const isPinned = pinnedIds.has(card.id);
                      const showOthersDivider =
                        !isPinned && firstNonPinnedIdx > 0 && idx === firstNonPinnedIdx;
                      return (
                        <div key={card.id}>
                          {showOthersDivider && (
                            <div className="px-1 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                              Outros cards
                            </div>
                          )}
                          <li>
                            <button
                              onClick={() => onSelect({ id: card.id, name: card.name })}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg border bg-bg-subtle px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover",
                                isPinned
                                  ? "border-warning/30 hover:border-warning/60"
                                  : "border-border/50 hover:border-accent/40",
                              )}
                            >
                              {isPinned && <Star className="h-3.5 w-3.5 shrink-0 fill-warning text-warning" />}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-fg">{card.name}</div>
                                {list && (
                                  <div className="text-[11px] text-fg-subtle">em {list.name}</div>
                                )}
                              </div>
                            </button>
                          </li>
                        </div>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
