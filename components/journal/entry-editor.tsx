"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Tags, X, Eye, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown-simple";

const MOODS = ["", "😀", "🙂", "😐", "😔", "😴", "🔥", "💡", "🎯"];

type Draft = { content: string; tags: string[]; mood: string; energy?: number };

export function EntryEditor({
  initialContent = "",
  initialTags = [],
  initialMood = "",
  initialEnergy = 0,
  autoFocus = false,
  submitLabel = "Salvar",
  availableTags = [],
  draftKey,
  withPreview = false,
  onSubmit,
  onCancel,
}: {
  initialContent?: string;
  initialTags?: string[];
  initialMood?: string;
  initialEnergy?: number;
  autoFocus?: boolean;
  submitLabel?: string;
  availableTags?: string[];
  draftKey?: string;
  withPreview?: boolean;
  onSubmit: (data: { content: string; tags: string[]; mood: string; energy: number }) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [mood, setMood] = useState(initialMood);
  const [energy, setEnergy] = useState(initialEnergy);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(withPreview);
  const [draftRestored, setDraftRestored] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Restaura rascunho ao montar
  useEffect(() => {
    if (!draftKey || typeof window === "undefined") return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as Draft;
      if (d.content || (d.tags && d.tags.length > 0) || d.mood || d.energy) {
        setContent(d.content ?? "");
        setTags(d.tags ?? []);
        setMood(d.mood ?? "");
        setEnergy(typeof d.energy === "number" ? d.energy : 0);
        setDraftRestored(true);
        setTimeout(() => setDraftRestored(false), 3000);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salva rascunho com debounce
  useEffect(() => {
    if (!draftKey || typeof window === "undefined") return;
    const id = setTimeout(() => {
      if (content || tags.length > 0 || mood || energy) {
        localStorage.setItem(draftKey, JSON.stringify({ content, tags, mood, energy }));
      } else {
        localStorage.removeItem(draftKey);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [content, tags, mood, energy, draftKey]);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  // Sugestões de tags filtradas
  const tagSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q || availableTags.length === 0) return [];
    return availableTags
      .filter((t) => t.toLowerCase().includes(q) && !tags.includes(t))
      .slice(0, 6);
  }, [tagInput, availableTags, tags]);

  function addTag(name?: string) {
    const t = (name ?? tagInput).trim().toLowerCase().replace(/,/g, "");
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function handleSubmit() {
    const c = content.trim();
    if (!c || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ content: c, tags, mood, energy });
      setContent("");
      setTags([]);
      setMood("");
      setEnergy(0);
      setTagInput("");
      if (draftKey && typeof window !== "undefined") {
        localStorage.removeItem(draftKey);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card space-y-3">
      {draftRestored && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[11px] text-accent">
          Rascunho restaurado ✓
        </div>
      )}

      <div className={cn("grid gap-3", showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        <textarea
          ref={ref}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={showPreview ? 8 : 3}
          placeholder="O que tá na sua mente? (Ctrl+Enter pra salvar, markdown ok)"
          className="w-full resize-none rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
        {showPreview && (
          <div
            className="overflow-y-auto rounded-lg border border-border bg-bg-subtle/40 px-3 py-2.5 text-sm text-fg"
            style={{ maxHeight: "240px" }}
          >
            <div
              className="space-y-1.5"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {MOODS.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMood(mood === m ? "" : m)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-base transition-all",
                mood === m
                  ? "border-accent bg-accent/15 scale-110"
                  : "border-transparent hover:bg-bg-hover",
              )}
              title={m || "sem mood"}
            >
              {m || <span className="text-[10px] text-fg-subtle">—</span>}
            </button>
          ))}
        </div>

        {/* Energy 1-5 */}
        <div className="flex items-center gap-1" title="Nível de energia (1=baixo, 5=alto)">
          <span className="text-[10px] text-fg-subtle">⚡</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEnergy(energy === n ? 0 : n)}
              className={cn(
                "h-3 w-3 rounded-full border transition-all",
                energy >= n
                  ? "border-warning bg-warning"
                  : "border-border bg-bg-subtle hover:border-warning/50",
              )}
              title={`Energia ${n}/5`}
            />
          ))}
        </div>

        <div className="relative ml-auto flex flex-1 items-center gap-2">
          <Tags className="h-3.5 w-3.5 text-fg-muted" />
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent"
              >
                #{t}
                <button onClick={() => removeTag(t)} className="hover:text-fg">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  if (tagSuggestions.length > 0) addTag(tagSuggestions[0]);
                  else addTag();
                } else if (e.key === "Tab" && tagSuggestions.length > 0) {
                  e.preventDefault();
                  addTag(tagSuggestions[0]);
                } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                  removeTag(tags[tags.length - 1]);
                }
              }}
              onBlur={() => setTimeout(() => addTag(), 150)}
              placeholder="adicionar tag..."
              className="bg-transparent text-[11px] placeholder:text-fg-subtle focus:outline-none"
              size={12}
            />
          </div>
          {tagSuggestions.length > 0 && tagInput && (
            <div className="absolute right-0 top-full z-10 mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-bg-card p-1 shadow-xl">
              {tagSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(s);
                  }}
                  className="rounded px-2 py-1 text-left text-[11px] text-accent hover:bg-accent/15"
                >
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          className="flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg"
          title="Alternar preview de markdown"
        >
          {showPreview ? (
            <>
              <FileText className="h-3 w-3" />
              Editar
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" />
              Preview
            </>
          )}
        </button>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} className="text-xs text-fg-muted hover:text-fg">
              Cancelar
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="btn-primary py-1.5 text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Salvando..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
