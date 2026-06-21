"use client";

import { useEffect, useState } from "react";
import { X, Search, Loader2, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectItem = {
  itemId: string;
  title: string;
  status: string | null;
  state: string | null;
  assignees: string[];
  cliente: string | null;
};

export function CardSelector({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (card: { id: string; name: string }) => void;
}) {
  const [items, setItems] = useState<ProjectItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/project/board")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok) throw new Error(d?.error ?? "Erro ao carregar o Project");
        const me = (d.myLogin as string | null)?.toLowerCase();
        const list = (d.items as ProjectItem[]).filter(
          (it) =>
            it.state !== "CLOSED" &&
            (!me || it.assignees.some((a) => a.toLowerCase() === me)),
        );
        setItems(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lower = search.toLowerCase();
  const filtered = (items ?? []).filter((it) =>
    lower ? it.title.toLowerCase().includes(lower) : true,
  );

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-12 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl rounded-xl border border-border bg-bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-fg">Vincular demanda</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-fg-muted hover:bg-bg-hover hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar demanda..."
              autoFocus
              className="input pl-9"
            />
          </div>

          {loading ? (
            <div className="flex h-16 items-center justify-center text-fg-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando demandas...
            </div>
          ) : error ? (
            <p className="py-4 text-center text-xs text-danger">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">
              Nenhuma demanda aberta atribuída a você
            </p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {filtered.map((it) => (
                <li key={it.itemId}>
                  <button
                    onClick={() => onSelect({ id: `project:${it.itemId}`, name: it.title })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2 text-left text-sm transition-colors hover:border-accent/40 hover:bg-bg-hover",
                    )}
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
      </div>
    </div>
  );
}
