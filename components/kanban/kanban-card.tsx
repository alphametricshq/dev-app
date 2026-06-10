"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, AlignLeft, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { confirmDialog } from "@/lib/dialogs";
import type { TrelloCardItem } from "@/lib/integrations/trello-api";
import { labelBg } from "@/lib/trello-labels";

export function KanbanCard({
  card,
  onOpen,
  onDelete,
  onTogglePin,
  pinned = false,
  pomodoroCount = 0,
  isDragging: isDraggingProp,
}: {
  card: TrelloCardItem;
  onOpen?: (card: TrelloCardItem) => void;
  onDelete?: (cardId: string) => void;
  onTogglePin?: (card: TrelloCardItem, currentlyPinned: boolean) => void;
  pinned?: boolean;
  pomodoroCount?: number;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const showOverlay = isDraggingProp || isDragging;
  const hasDesc = card.desc && card.desc.trim().length > 0;
  const labels = card.labels ?? [];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen?.(card)}
      onKeyDown={(e) => {
        // Enter abre o card (Space fica pro drag via KeyboardSensor)
        if (e.key === "Enter" && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen?.(card);
        }
      }}
      className={cn(
        "group relative cursor-pointer touch-none rounded-lg border bg-bg-card p-2.5 text-sm shadow-sm transition-colors hover:bg-bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
        pinned ? "border-warning/40 hover:border-warning/60" : "border-border hover:border-border-strong",
        showOverlay && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {labels.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {labels.map((l) =>
                l.name ? (
                  <span
                    key={l.id}
                    title={l.color ?? ""}
                    className="inline-block max-w-[140px] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white"
                    style={{ backgroundColor: labelBg(l.color) }}
                  >
                    {l.name}
                  </span>
                ) : (
                  <span
                    key={l.id}
                    title={l.color ?? "label"}
                    className="inline-block h-2 w-8 rounded-full"
                    style={{ backgroundColor: labelBg(l.color) }}
                  />
                )
              )}
            </div>
          )}
          <div className="whitespace-pre-wrap break-words text-fg">{card.name}</div>
          {(hasDesc || pomodoroCount > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-fg-subtle">
              {hasDesc && (
                <span className="flex items-center gap-1">
                  <AlignLeft className="h-3 w-3" />
                  desc
                </span>
              )}
              {pomodoroCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-warning/10 px-1.5 py-0.5 text-warning">
                  🍅 {pomodoroCount}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-0.5">
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(card, pinned);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "rounded p-1 transition-all",
                pinned
                  ? "text-warning opacity-100"
                  : "text-fg-subtle opacity-0 hover:bg-bg-hover hover:text-warning group-hover:opacity-100 focus-visible:opacity-100",
              )}
              aria-label={pinned ? "Desafixar" : "Fixar como prioridade"}
            >
              <Star className={cn("h-3.5 w-3.5", pinned && "fill-warning")} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const ok = await confirmDialog({
                  title: `Apagar "${card.name}"?`,
                  confirmLabel: "Apagar",
                  danger: true,
                });
                if (ok) onDelete(card.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded p-1 text-fg-subtle opacity-0 transition-opacity hover:bg-danger/20 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Apagar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
