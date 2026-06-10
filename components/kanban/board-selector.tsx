"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Board = { id: string; name: string };

export function BoardSelector({
  selectedId,
  onSelect,
  onError,
  onLoaded,
}: {
  selectedId: string | null;
  onSelect: (board: Board) => void;
  /** Chamado quando a busca de boards falha (ok:false ou erro de rede). */
  onError?: (message: string) => void;
  /** Chamado quando a busca termina com sucesso, com a quantidade de boards. */
  onLoaded?: (count: number) => void;
}) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  const onLoadedRef = useRef(onLoaded);
  onErrorRef.current = onError;
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancel = false;
    fetch("/api/trello/boards")
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        if (data?.ok && Array.isArray(data.boards)) {
          setBoards(data.boards);
          onLoadedRef.current?.(data.boards.length);
          if (!selectedId && data.boards.length > 0) onSelect(data.boards[0]);
        } else {
          const msg = data?.error ?? "Erro ao buscar boards do Trello";
          setError(msg);
          onErrorRef.current?.(msg);
        }
      })
      .catch((e) => {
        if (cancel) return;
        const msg = e instanceof Error ? e.message : "Erro ao buscar boards do Trello";
        setError(msg);
        onErrorRef.current?.(msg);
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = boards.find((b) => b.id === selectedId);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading || !!error || boards.length === 0}
        className="btn-secondary min-w-[220px] justify-between"
      >
        <span className="flex items-center gap-1.5 truncate">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : error ? (
            <>
              <TriangleAlert className="h-3.5 w-3.5 text-warning" />
              Erro ao carregar
            </>
          ) : (
            selected?.name ?? "Nenhum board"
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {/* Aviso inline quando ninguém trata o erro lá em cima */}
      {error && !onError && (
        <div className="mt-1.5 text-[11px] text-warning">{error}</div>
      )}
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl">
          <ul className="max-h-72 overflow-y-auto py-1">
            {boards.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => {
                    onSelect(b);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover",
                    b.id === selectedId ? "text-fg" : "text-fg-muted"
                  )}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
