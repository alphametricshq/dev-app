"use client";

import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { BoardSelector } from "@/components/kanban/board-selector";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default function BoardPage() {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState<string>("");

  return (
    <>
      <Topbar title="Board" subtitle="Gerencie cards e listas direto pelo dashboard" />
      <div className="space-y-4 px-8 py-6">
        <div className="flex items-center justify-between gap-3">
          <BoardSelector
            selectedId={boardId}
            onSelect={(b) => {
              setBoardId(b.id);
              setBoardName(b.name);
            }}
          />
          {boardName && (
            <span className="text-xs text-fg-muted">
              Mudanças sincronizam com o Trello em tempo real
            </span>
          )}
        </div>

        {boardId ? (
          <KanbanBoard key={boardId} boardId={boardId} />
        ) : (
          <div className="flex h-[400px] items-center justify-center text-fg-muted">
            Selecione um board acima
          </div>
        )}
      </div>
    </>
  );
}
