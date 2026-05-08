"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Board = { id: string; name: string };

export function BoardSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (board: Board) => void;
}) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    fetch("/api/trello/boards")
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        if (data?.ok && Array.isArray(data.boards)) {
          setBoards(data.boards);
          if (!selectedId && data.boards.length > 0) onSelect(data.boards[0]);
        }
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
        disabled={loading || boards.length === 0}
        className="btn-secondary min-w-[220px] justify-between"
      >
        <span className="truncate">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            selected?.name ?? "Nenhum board"
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
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
