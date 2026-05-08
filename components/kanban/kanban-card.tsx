"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrelloCardItem } from "@/lib/integrations/trello-api";

export function KanbanCard({
  card,
  onOpen,
  onDelete,
  isDragging: isDraggingProp,
}: {
  card: TrelloCardItem;
  onOpen?: (card: TrelloCardItem) => void;
  onDelete?: (cardId: string) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const showOverlay = isDraggingProp || isDragging;
  const hasDesc = card.desc && card.desc.trim().length > 0;

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
      className={cn(
        "group relative cursor-pointer touch-none rounded-lg border border-border bg-bg-card p-2.5 text-sm shadow-sm transition-colors hover:border-border-strong hover:bg-bg-hover",
        showOverlay && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="whitespace-pre-wrap break-words text-fg">{card.name}</div>
          {hasDesc && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-fg-subtle">
              <AlignLeft className="h-3 w-3" />
              <span>tem descrição</span>
            </div>
          )}
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Apagar "${card.name}"?`)) onDelete(card.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="shrink-0 rounded p-1 text-fg-subtle opacity-0 transition-opacity hover:bg-danger/20 hover:text-danger group-hover:opacity-100"
            aria-label="Apagar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
