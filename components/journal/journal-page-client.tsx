"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, BookOpen, X } from "lucide-react";
import { EntryEditor } from "./entry-editor";
import { EntryCard } from "./entry-card";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { JournalEntry } from "@/lib/db/journal-queries";

export function JournalPageClient() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => refresh(), 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTag]);

  async function refresh() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (activeTag) params.set("tag", activeTag);
      const res = await fetch(`/api/journal?${params}`);
      const data = await res.json();
      if (data?.ok) {
        setEntries(data.entries);
        setAllTags(data.tags);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: { content: string; tags: string[]; mood: string }) {
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result?.ok) throw new Error(result?.error);
      toast.success("Nota salva");
      await refresh();
    } catch (e) {
      toast.error("Erro ao salvar", e instanceof Error ? e.message : "Erro desconhecido");
    }
  }

  async function handleUpdate(
    id: number,
    data: { content: string; tags: string[]; mood: string },
  ) {
    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result?.ok) throw new Error(result?.error);
      toast.success("Nota atualizada");
      await refresh();
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : "Erro desconhecido");
    }
  }

  async function handleDelete(id: number) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
      toast.success("Nota apagada");
      refresh();
    } catch {
      toast.error("Erro ao apagar");
      refresh();
    }
  }

  return (
    <div className="space-y-5">
      <EntryEditor onSubmit={handleCreate} submitLabel="Adicionar" autoFocus />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nas suas notas..."
              className="input pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTag(null)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                !activeTag
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-fg-muted hover:bg-bg-hover hover:text-fg",
              )}
            >
              todas
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                  activeTag === t
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-fg-muted hover:bg-bg-hover hover:text-fg",
                )}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-fg-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando...
        </div>
      ) : entries.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <BookOpen className="h-8 w-8 text-fg-subtle" />
          <p className="text-sm text-fg-muted">
            {search || activeTag
              ? "Nenhuma nota encontrada com esses filtros."
              : "Nenhuma nota ainda. Comece escrevendo acima."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
