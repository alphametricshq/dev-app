"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Tags, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MOODS = ["", "😀", "🙂", "😐", "😔", "😴", "🔥", "💡", "🎯"];

export function EntryEditor({
  initialContent = "",
  initialTags = [],
  initialMood = "",
  autoFocus = false,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
}: {
  initialContent?: string;
  initialTags?: string[];
  initialMood?: string;
  autoFocus?: boolean;
  submitLabel?: string;
  onSubmit: (data: { content: string; tags: string[]; mood: string }) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [mood, setMood] = useState(initialMood);
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/,/g, "");
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
      await onSubmit({ content: c, tags, mood });
      setContent("");
      setTags([]);
      setMood("");
      setTagInput("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card space-y-3">
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
        rows={3}
        placeholder="O que tá na sua mente? (Ctrl+Enter pra salvar)"
        className="w-full resize-none rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
      />

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

        <div className="ml-auto flex flex-1 items-center gap-2">
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
                  addTag();
                } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                  removeTag(tags[tags.length - 1]);
                }
              }}
              onBlur={addTag}
              placeholder="adicionar tag..."
              className="bg-transparent text-[11px] placeholder:text-fg-subtle focus:outline-none"
              size={12}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
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
  );
}
