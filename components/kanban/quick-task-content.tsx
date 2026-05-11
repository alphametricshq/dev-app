"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanSquare, X, CheckCircle2, Loader2, Send } from "lucide-react";

type Board = { id: string; name: string };
type List = { id: string; name: string; closed: boolean };

const TODO_HINTS = ["to-do", "todo", "to do", "a fazer", "afazer", "backlog", "pra fazer"];
const LAST_BOARD_KEY = "quick-task-last-board";

type ElectronAPI = {
  closeQuickTask?: () => void;
};

function closeWindow() {
  const api = (window as unknown as { electron?: ElectronAPI }).electron;
  api?.closeQuickTask?.();
}

export function QuickTaskContent() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingLists, setLoadingLists] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeWindow();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Boards
  useEffect(() => {
    fetch("/api/trello/boards")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.boards)) {
          setBoards(data.boards);
          const last = typeof window !== "undefined" ? localStorage.getItem(LAST_BOARD_KEY) : null;
          const defaultId =
            last && data.boards.some((b: Board) => b.id === last) ? last : data.boards[0]?.id ?? null;
          setSelectedBoardId(defaultId);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingBoards(false));
  }, []);

  // Lists do board selecionado
  useEffect(() => {
    if (!selectedBoardId) return;
    setLoadingLists(true);
    fetch(`/api/trello/boards/${selectedBoardId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.board) setLists(data.board.lists ?? []);
      })
      .finally(() => setLoadingLists(false));
  }, [selectedBoardId]);

  // Detecta lista alvo: primeira que bate em TODO_HINTS, senão a primeira aberta
  const targetList = useMemo(() => {
    const open = lists.filter((l) => !l.closed).sort((a, b) => {
      // ordena pela ordem original (lib retorna sorted by pos)
      return 0;
    });
    const matched = open.find((l) =>
      TODO_HINTS.some((h) => l.name.toLowerCase().includes(h)),
    );
    return matched ?? open[0] ?? null;
  }, [lists]);

  async function submit() {
    if (!title.trim() || !targetList || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/trello/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idList: targetList.id,
          name: title.trim(),
          desc: desc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error ?? "Erro ao criar");
      if (selectedBoardId) localStorage.setItem(LAST_BOARD_KEY, selectedBoardId);
      setSaved(true);
      setTimeout(() => closeWindow(), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-border bg-bg-card shadow-2xl">
      <header
        className="flex items-center justify-between border-b border-border px-4 py-2.5"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <KanbanSquare className="h-4 w-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Nova task</h1>
          <span className="text-[10px] text-fg-subtle">Esc fecha · Ctrl+Enter cria</span>
        </div>
        <button
          onClick={closeWindow}
          className="rounded-lg p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div
        className="flex-1 space-y-3 overflow-y-auto p-4"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {saved ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-success">
            <CheckCircle2 className="h-10 w-10" />
            <p className="text-sm font-medium">Card criado!</p>
            {targetList && (
              <p className="text-[11px] text-fg-subtle">em &ldquo;{targetList.name}&rdquo;</p>
            )}
          </div>
        ) : loadingBoards ? (
          <div className="flex h-full items-center justify-center text-fg-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando boards...
          </div>
        ) : boards.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-fg-muted">
            Nenhum board do Trello disponível
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
              }}
              placeholder="Título da task..."
              className="input"
            />

            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
              }}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                {boards.length > 1 && (
                  <select
                    value={selectedBoardId ?? ""}
                    onChange={(e) => setSelectedBoardId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-subtle px-2 py-1 text-xs text-fg focus:border-accent focus:outline-none"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-fg-subtle">
                  {loadingLists ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      buscando lista...
                    </span>
                  ) : targetList ? (
                    <>
                      vai pra <span className="text-fg">&ldquo;{targetList.name}&rdquo;</span>
                    </>
                  ) : (
                    <span className="text-warning">sem lista disponível</span>
                  )}
                </p>
              </div>

              <button
                onClick={submit}
                disabled={!title.trim() || !targetList || submitting || loadingLists}
                className="btn-primary py-1.5 text-xs"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Criando..." : "Criar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
