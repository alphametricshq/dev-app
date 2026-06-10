"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, TriangleAlert } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { BoardSelector } from "@/components/kanban/board-selector";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default function BoardPage() {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);

  const trelloNotConfigured =
    !!error && (error.includes("TRELLO_API_KEY") || error.includes("ausentes"));

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
            onError={setError}
            onLoaded={setBoardCount}
          />
          {boardName && (
            <span className="text-xs text-fg-muted">
              Mudanças sincronizam com o Trello em tempo real
            </span>
          )}
        </div>

        {trelloNotConfigured ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <div className="text-center">
              <div className="text-base font-semibold text-fg">Trello não configurado</div>
              <p className="mt-1 max-w-sm text-sm text-fg-muted">
                Pra usar o board, configure sua API Key e Token do Trello nas configurações.
              </p>
            </div>
            <Link href="/settings#credenciais" className="btn-primary">
              <Settings className="h-4 w-4" />
              Configurar credenciais
            </Link>
          </div>
        ) : error ? (
          <div className="flex h-[400px] flex-col items-center justify-center gap-2 text-center">
            <div className="text-sm font-medium text-danger">Erro ao carregar boards</div>
            <p className="max-w-sm text-xs text-fg-muted">{error}</p>
          </div>
        ) : boardId ? (
          <KanbanBoard key={boardId} boardId={boardId} />
        ) : boardCount === 0 ? (
          <div className="flex h-[400px] items-center justify-center text-fg-muted">
            Nenhum board na sua conta do Trello
          </div>
        ) : (
          <div className="flex h-[400px] items-center justify-center text-fg-muted">
            Selecione um board acima
          </div>
        )}
      </div>
    </>
  );
}
