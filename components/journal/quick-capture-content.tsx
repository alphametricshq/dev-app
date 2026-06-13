"use client";

import { useEffect, useState } from "react";
import { BookOpen, X, CheckCircle2 } from "lucide-react";
import { EntryEditor } from "./entry-editor";

type ElectronAPI = {
  closeQuickCapture?: () => void;
};

const DRAFT_KEY = "quick-capture-draft-v1";

export function QuickCaptureContent() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.tags)) setTags(d.tags);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeWindow();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function closeWindow() {
    const api = (window as unknown as { electron?: ElectronAPI }).electron;
    api?.closeQuickCapture?.();
  }

  async function handleSubmit(data: { content: string; tags: string[]; mood: string; energy: number }) {
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result?.ok) throw new Error(result?.error ?? "Erro ao salvar");
      setSaved(true);
      // Fecha após 800ms pra dar feedback visual
      setTimeout(() => closeWindow(), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-border bg-bg-card shadow-2xl">
      <header
        className="flex items-center justify-between border-b border-border px-4 py-2.5"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">Quick capture</h1>
          <span className="text-[10px] text-fg-subtle">Esc fecha · Ctrl+Enter salva</span>
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
        className="flex-1 overflow-y-auto p-4"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {saved ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-success">
            <CheckCircle2 className="h-10 w-10" />
            <p className="text-sm font-medium">Salvo!</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-2 rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}
            <EntryEditor
              onSubmit={handleSubmit}
              submitLabel="Salvar"
              autoFocus
              availableTags={tags}
              draftKey={DRAFT_KEY}
              withPreview
            />
          </>
        )}
      </div>
    </div>
  );
}
