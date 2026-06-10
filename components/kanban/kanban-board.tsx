"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Loader2, AlertCircle, Tag, X } from "lucide-react";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { CardModal } from "./card-modal";
import { toast } from "@/lib/toast";
import type { TrelloBoardFull, TrelloCardItem, TrelloListItem } from "@/lib/integrations/trello-api";
import type { Template, CardTemplateData } from "@/lib/db/templates-queries";
import { labelBg } from "@/lib/trello-labels";
import { cn } from "@/lib/utils";

export function KanbanBoard({ boardId }: { boardId: string }) {
  const [board, setBoard] = useState<TrelloBoardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<TrelloCardItem | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pomodoroCounts, setPomodoroCounts] = useState<Record<string, { count: number; minutes: number }>>({});
  const [addingList, setAddingList] = useState(false);
  const [listDraft, setListDraft] = useState("");
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set());
  const listInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Fetch board + pinned cards
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/trello/boards/${boardId}`).then((r) => r.json()),
      fetch(`/api/trello/cards/pinned`).then((r) => r.json()),
      fetch(`/api/pomodoro/by-card`).then((r) => r.json()),
    ])
      .then(([boardData, pinnedData, pomodoroData]) => {
        if (cancel) return;
        if (!boardData?.ok) throw new Error(boardData?.error ?? "Falha ao carregar board");
        setBoard(boardData.board);
        if (pinnedData?.ok && Array.isArray(pinnedData.cards)) {
          setPinnedIds(new Set(pinnedData.cards.map((c: { card_id: string }) => c.card_id)));
        }
        if (pomodoroData?.ok && pomodoroData.counts) {
          setPomodoroCounts(pomodoroData.counts);
        }
      })
      .catch((e) => !cancel && toast.error("Erro ao carregar board", e instanceof Error ? e.message : String(e)))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [boardId]);

  useEffect(() => {
    if (addingList && listInputRef.current) listInputRef.current.focus();
  }, [addingList]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-fg-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando board...
      </div>
    );
  }
  if (!board) {
    return (
      <div className="flex h-[400px] items-center justify-center gap-2 text-danger">
        <AlertCircle className="h-5 w-5" />
        Board não encontrado
      </div>
    );
  }

  const sortedLists = [...board.lists].sort((a, b) => a.pos - b.pos);

  function cardsOf(listId: string) {
    if (!board) return [];
    return board.cards
      .filter((c) => c.idList === listId)
      .filter((c) => {
        if (labelFilter.size === 0) return true;
        return c.idLabels?.some((id) => labelFilter.has(id));
      })
      .sort((a, b) => a.pos - b.pos);
  }

  // Labels usadas em pelo menos um card aberto, agrupadas pra rendering
  const usedLabels = (() => {
    if (!board) return [];
    const usedIds = new Set<string>();
    for (const c of board.cards) for (const id of c.idLabels ?? []) usedIds.add(id);
    return board.labels.filter((l) => usedIds.has(l.id));
  })();

  function toggleLabelFilter(id: string) {
    setLabelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function findCard(cardId: string) {
    return board?.cards.find((c) => c.id === cardId);
  }

  function findContainer(id: string): string | undefined {
    if (id.startsWith("list:")) return id.slice(5);
    return findCard(id)?.idList;
  }

  // Cards otimistas (criados mas ainda sem id real do Trello) não podem
  // disparar chamadas de API — o id temp-* é inválido lá
  function isTempId(id: string): boolean {
    return id.startsWith("temp-");
  }

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (isTempId(id)) return;
    const card = findCard(id);
    if (card) setActiveCard(card);
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over || !board) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const card = prev.cards.find((c) => c.id === activeId);
      if (!card) return prev;
      return {
        ...prev,
        cards: prev.cards.map((c) => (c.id === activeId ? { ...c, idList: overContainer } : c)),
      };
    });
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveCard(null);
    if (!over || !board) return;
    const activeId = String(active.id);
    if (isTempId(activeId)) return;
    const overId = String(over.id);
    const card = findCard(activeId);
    if (!card) return;

    const containerId = findContainer(overId);
    if (!containerId) return;

    // Reordena dentro da lista destino
    setBoard((prev) => {
      if (!prev) return prev;
      const sameList = prev.cards.filter((c) => c.idList === containerId).sort((a, b) => a.pos - b.pos);
      const oldIndex = sameList.findIndex((c) => c.id === activeId);
      let newIndex = sameList.findIndex((c) => c.id === overId);
      if (overId.startsWith("list:") || newIndex === -1) newIndex = sameList.length - 1;

      const reordered = arrayMove(sameList, oldIndex, newIndex);
      const otherLists = prev.cards.filter((c) => c.idList !== containerId);
      // Reatribui pos como índice * 1000 (Trello aceita qualquer valor float; serve pra ordenar local)
      const repositioned = reordered.map((c, i) => ({ ...c, pos: (i + 1) * 1000 }));
      return { ...prev, cards: [...otherLists, ...repositioned] };
    });

    // Computa pos absoluta pro Trello: top, bottom, ou índice
    const listCards = board.cards
      .filter((c) => c.idList === containerId && c.id !== activeId)
      .sort((a, b) => a.pos - b.pos);
    let pos: "top" | "bottom" | number = "bottom";
    if (overId.startsWith("list:")) {
      pos = "bottom";
    } else {
      const overIdx = listCards.findIndex((c) => c.id === overId);
      if (overIdx === 0) pos = "top";
      else if (overIdx === listCards.length - 1) pos = "bottom";
      else if (overIdx > 0) pos = (listCards[overIdx - 1].pos + listCards[overIdx].pos) / 2;
    }

    try {
      const res = await fetch(`/api/trello/cards/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idList: containerId, pos }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error ?? "Erro ao mover card");
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      // Refetch pra recuperar estado correto
      refetch();
    }
  }

  async function refetch() {
    const res = await fetch(`/api/trello/boards/${boardId}`);
    const data = await res.json();
    if (data?.ok) setBoard(data.board);
  }

  // ============== Mutações ==============

  async function addCard(listId: string, name: string) {
    if (!board) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: TrelloCardItem = {
      id: tempId,
      name,
      desc: "",
      idList: listId,
      idBoard: board.id,
      pos: 999999,
      url: "",
      due: null,
      dueComplete: false,
      closed: false,
      idLabels: [],
      labels: [],
    };
    setBoard((prev) => prev && { ...prev, cards: [...prev.cards, optimistic] });
    try {
      const res = await fetch("/api/trello/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idList: listId, name }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      setBoard((prev) => prev && { ...prev, cards: prev.cards.map((c) => (c.id === tempId ? data.card : c)) });
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      setBoard((prev) => prev && { ...prev, cards: prev.cards.filter((c) => c.id !== tempId) });
    }
  }

  async function applyTemplate(listId: string, tpl: Template<CardTemplateData>) {
    if (!board) return;
    try {
      const cardRes = await fetch("/api/trello/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idList: listId,
          name: tpl.data.name || tpl.name,
          desc: tpl.data.desc,
        }),
      });
      const cardData = await cardRes.json();
      if (!cardData?.ok) throw new Error(cardData?.error);
      const newCard = cardData.card;

      // Cria checklists e items em paralelo
      const checklists = tpl.data.checklists ?? [];
      for (const cl of checklists) {
        const clRes = await fetch(`/api/trello/cards/${newCard.id}/checklists`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cl.name }),
        });
        const clData = await clRes.json();
        if (clData?.ok && cl.items?.length) {
          for (const item of cl.items) {
            await fetch(`/api/trello/checklists/${clData.checklist.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: item }),
            });
          }
        }
      }

      toast.success("Card criado", `Template "${tpl.name}" aplicado`);
      await refetch();
    } catch (e) {
      toast.error("Erro ao aplicar template", e instanceof Error ? e.message : String(e));
    }
  }

  async function updateCardDetails(cardId: string, input: { name?: string; desc?: string }) {
    if (!board || isTempId(cardId)) return;
    const before = board.cards.find((c) => c.id === cardId);
    if (!before) return;
    setBoard(
      (prev) =>
        prev && { ...prev, cards: prev.cards.map((c) => (c.id === cardId ? { ...c, ...input } : c)) },
    );
    try {
      const res = await fetch(`/api/trello/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      setBoard(
        (prev) => prev && { ...prev, cards: prev.cards.map((c) => (c.id === cardId ? before : c)) },
      );
    }
  }

  async function deleteCard(cardId: string) {
    if (!board || isTempId(cardId)) return;
    const before = board.cards.find((c) => c.id === cardId);
    setBoard((prev) => prev && { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) });
    try {
      const res = await fetch(`/api/trello/cards/${cardId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      if (before) setBoard((prev) => prev && { ...prev, cards: [...prev.cards, before] });
    }
  }

  async function addList(name: string) {
    if (!board) return;
    const tempId = `temp-${Date.now()}`;
    const maxPos = Math.max(0, ...board.lists.map((l) => l.pos));
    const optimistic: TrelloListItem = {
      id: tempId,
      name,
      idBoard: board.id,
      closed: false,
      pos: maxPos + 1000,
    };
    setBoard((prev) => prev && { ...prev, lists: [...prev.lists, optimistic] });
    try {
      const res = await fetch("/api/trello/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idBoard: board.id, name }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      setBoard(
        (prev) => prev && { ...prev, lists: prev.lists.map((l) => (l.id === tempId ? data.list : l)) },
      );
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      setBoard((prev) => prev && { ...prev, lists: prev.lists.filter((l) => l.id !== tempId) });
    }
  }

  async function renameList(listId: string, name: string) {
    if (!board) return;
    const before = board.lists.find((l) => l.id === listId);
    setBoard((prev) => prev && { ...prev, lists: prev.lists.map((l) => (l.id === listId ? { ...l, name } : l)) });
    try {
      const res = await fetch(`/api/trello/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      if (before) {
        setBoard(
          (prev) => prev && { ...prev, lists: prev.lists.map((l) => (l.id === listId ? before : l)) },
        );
      }
    }
  }

  async function togglePinCard(card: TrelloCardItem, currentlyPinned: boolean) {
    if (!board || isTempId(card.id)) return;
    // Updates funcionais: rollback com snapshot sobrescrevia toggles
    // concorrentes de outros cards feitos enquanto o fetch estava em voo
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (currentlyPinned) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
    try {
      const list = board.lists.find((l) => l.id === card.idList);
      if (currentlyPinned) {
        const res = await fetch(`/api/trello/cards/${card.id}/pin`, { method: "DELETE" });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error);
      } else {
        const res = await fetch(`/api/trello/cards/${card.id}/pin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            board_id: card.idBoard,
            card_name: card.name,
            list_name: list?.name ?? null,
            url: card.url,
          }),
        });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error);
      }
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      // rollback só do card afetado
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (currentlyPinned) next.add(card.id);
        else next.delete(card.id);
        return next;
      });
    }
  }

  async function archiveList(listId: string) {
    if (!board) return;
    const before = board.lists.find((l) => l.id === listId);
    setBoard((prev) => prev && { ...prev, lists: prev.lists.filter((l) => l.id !== listId) });
    try {
      const res = await fetch(`/api/trello/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closed: true }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      if (before) setBoard((prev) => prev && { ...prev, lists: [...prev.lists, before] });
    }
  }

  function commitNewList() {
    const trimmed = listDraft.trim();
    if (trimmed) addList(trimmed);
    setListDraft("");
    setAddingList(false);
  }

  return (
    <div className="space-y-3">
      {usedLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-fg-subtle" />
          {usedLabels.map((l) => {
            const active = labelFilter.has(l.id);
            return (
              <button
                key={l.id}
                onClick={() => toggleLabelFilter(l.id)}
                title={l.name || l.color || ""}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-semibold leading-tight text-white transition-opacity",
                  labelFilter.size > 0 && !active && "opacity-40 hover:opacity-100",
                )}
                style={{ backgroundColor: labelBg(l.color) }}
              >
                {l.name || l.color || "—"}
              </button>
            );
          })}
          {labelFilter.size > 0 && (
            <button
              onClick={() => setLabelFilter(new Set())}
              className="ml-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-fg-muted hover:bg-bg-hover hover:text-fg"
            >
              <X className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          <SortableContext items={sortedLists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
            {sortedLists.map((list) => (
              <KanbanColumn
                key={list.id}
                list={list}
                cards={cardsOf(list.id)}
                pinnedIds={pinnedIds}
                pomodoroCounts={pomodoroCounts}
                onAddCard={addCard}
                onApplyTemplate={applyTemplate}
                onOpenCard={(c) => {
                  if (!isTempId(c.id)) setOpenCardId(c.id);
                }}
                onDeleteCard={deleteCard}
                onTogglePinCard={togglePinCard}
                onRenameList={renameList}
                onArchiveList={archiveList}
              />
            ))}
          </SortableContext>

          {addingList ? (
            <div className="w-72 shrink-0 rounded-xl border border-border bg-bg-subtle/60 p-3">
              <input
                ref={listInputRef}
                value={listDraft}
                onChange={(e) => setListDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNewList();
                  else if (e.key === "Escape") {
                    setListDraft("");
                    setAddingList(false);
                  }
                }}
                placeholder="Nome da lista..."
                className="input mb-2"
              />
              <div className="flex gap-2">
                <button onClick={commitNewList} className="btn-primary py-1.5 text-xs">
                  Adicionar lista
                </button>
                <button
                  onClick={() => {
                    setListDraft("");
                    setAddingList(false);
                  }}
                  className="text-xs text-fg-muted hover:text-fg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingList(true)}
              className="flex h-10 w-72 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-fg-muted transition-colors hover:border-border-strong hover:bg-bg-hover hover:text-fg"
            >
              <Plus className="h-4 w-4" />
              Adicionar lista
            </button>
          )}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="rotate-2 cursor-grabbing">
              <KanbanCard card={activeCard} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openCardId && (() => {
        const openCard = board.cards.find((c) => c.id === openCardId);
        if (!openCard) return null;
        const list = board.lists.find((l) => l.id === openCard.idList);
        return (
          <CardModal
            card={openCard}
            list={list}
            pinned={pinnedIds.has(openCardId)}
            onClose={() => setOpenCardId(null)}
            onSave={(input) => updateCardDetails(openCardId, input)}
            onDelete={() => deleteCard(openCardId)}
            onTogglePin={() => togglePinCard(openCard, pinnedIds.has(openCardId))}
          />
        );
      })()}
    </div>
  );
}
