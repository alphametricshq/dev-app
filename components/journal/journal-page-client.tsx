"use client";

import { localIsoDate } from "@/lib/local-date";
import { useEffect, useRef, useState } from "react";
import { Search, Loader2, BookOpen, X, Download } from "lucide-react";
import { EntryEditor } from "./entry-editor";
import { EntryCard } from "./entry-card";
import { JournalStatsSidebar } from "./journal-stats-sidebar";
import { toast } from "@/lib/toast";
import { entriesToMarkdown, downloadMarkdown, isoDateShort } from "@/lib/journal-export";
import type { JournalEntry, JournalStats } from "@/lib/db/journal-queries";

export function JournalPageClient() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [exportMenuOpen]);

  async function fetchAll(): Promise<JournalEntry[]> {
    const res = await fetch("/api/journal?limit=10000");
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error ?? "Falha ao buscar");
    return data.entries as JournalEntry[];
  }

  async function handleExport(scope: "filtered" | "all" | "30d" | "90d") {
    setExportMenuOpen(false);
    try {
      let payload: JournalEntry[];
      let subtitle = "";
      if (scope === "filtered") {
        payload = entries;
        const parts: string[] = [];
        if (search.trim()) parts.push(`busca: "${search.trim()}"`);
        if (activeTag) parts.push(`tag: #${activeTag}`);
        subtitle = parts.length > 0 ? `Filtrado por ${parts.join(", ")}` : "Sem filtro";
      } else if (scope === "all") {
        payload = await fetchAll();
        subtitle = "Todas as entradas";
      } else {
        const all = await fetchAll();
        const days = scope === "30d" ? 30 : 90;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffIso = localIsoDate(cutoff);
        payload = all.filter((e) => e.created_at >= cutoffIso);
        subtitle = `Últimos ${days} dias`;
      }
      if (payload.length === 0) {
        toast.info("Nada pra exportar", "Nenhuma entrada nesse escopo");
        return;
      }
      const md = entriesToMarkdown(payload, { title: "Journal", subtitle });
      downloadMarkdown(`journal-${isoDateShort()}.md`, md);
      toast.success("Exportado", `${payload.length} entrada${payload.length === 1 ? "" : "s"} em markdown`);
    } catch (e) {
      toast.error("Erro ao exportar", e instanceof Error ? e.message : String(e));
    }
  }

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
        if (data.stats) setStats(data.stats);
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <EntryEditor
        onSubmit={handleCreate}
        submitLabel="Adicionar"
        autoFocus
        availableTags={stats?.tagCounts.map((t) => t.tag) ?? []}
        draftKey="journal-draft-v1"
      />

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
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setExportMenuOpen((o) => !o)}
              className="btn-secondary py-1.5 text-xs"
              title="Exportar entradas em markdown"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl">
                <button
                  onClick={() => handleExport("filtered")}
                  className="block w-full px-3 py-2 text-left text-xs text-fg-muted hover:bg-bg-hover hover:text-fg"
                  disabled={loading || entries.length === 0}
                >
                  Filtradas atuais{" "}
                  <span className="text-fg-subtle">({entries.length})</span>
                </button>
                <button
                  onClick={() => handleExport("30d")}
                  className="block w-full px-3 py-2 text-left text-xs text-fg-muted hover:bg-bg-hover hover:text-fg"
                >
                  Últimos 30 dias
                </button>
                <button
                  onClick={() => handleExport("90d")}
                  className="block w-full px-3 py-2 text-left text-xs text-fg-muted hover:bg-bg-hover hover:text-fg"
                >
                  Últimos 90 dias
                </button>
                <button
                  onClick={() => handleExport("all")}
                  className="block w-full border-t border-border px-3 py-2 text-left text-xs text-fg-muted hover:bg-bg-hover hover:text-fg"
                >
                  Tudo
                </button>
              </div>
            )}
          </div>
        </div>

        {activeTag && (
          <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs">
            <span className="text-accent">Filtrando por #{activeTag}</span>
            <button
              onClick={() => setActiveTag(null)}
              className="ml-auto text-fg-muted hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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

      <JournalStatsSidebar
        stats={stats}
        activeTag={activeTag}
        onSelectTag={(tag) => setActiveTag(tag)}
      />
    </div>
  );
}
