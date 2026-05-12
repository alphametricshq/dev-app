"use client";

import { useState, useEffect } from "react";
import { X, Bookmark, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitWithStats } from "@/lib/db/habits-queries";
import type { Template, HabitTemplateData } from "@/lib/db/templates-queries";
import { toast } from "@/lib/toast";

const EMOJI_PRESETS = ["✨", "🏃", "📖", "💧", "🧘", "💪", "😴", "🍎", "🎵", "✍️", "💼", "🌱"];
const COLOR_PRESETS: { id: string; class: string }[] = [
  { id: "accent", class: "bg-accent" },
  { id: "success", class: "bg-success" },
  { id: "warning", class: "bg-warning" },
  { id: "danger", class: "bg-danger" },
  { id: "blue", class: "bg-[hsl(200_80%_60%)]" },
  { id: "pink", class: "bg-[hsl(320_70%_65%)]" },
];

export type HabitFormValues = {
  name: string;
  emoji: string;
  color: string;
  target_per_week: number;
};

export function HabitForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: HabitWithStats | null;
  onClose: () => void;
  onSave: (values: HabitFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "✨");
  const [color, setColor] = useState(initial?.color ?? "accent");
  const [target, setTarget] = useState(initial?.target_per_week ?? 7);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template<HabitTemplateData>[]>([]);
  const isEdit = !!initial;

  useEffect(() => {
    if (isEdit) return;
    fetch("/api/templates?type=habit")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setTemplates(d.templates ?? []);
      })
      .catch(() => {});
  }, [isEdit]);

  function applyTemplate(t: Template<HabitTemplateData>) {
    setName(t.data.name || t.name);
    if (t.data.emoji) setEmoji(t.data.emoji);
    if (t.data.color) setColor(t.data.color);
    if (typeof t.data.target_per_week === "number") setTarget(t.data.target_per_week);
  }

  async function saveAsTemplate() {
    if (!name.trim()) return;
    const tplName = prompt("Nome do template:", name);
    if (!tplName?.trim()) return;
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "habit",
          name: tplName.trim(),
          data: { name: name.trim(), emoji, color, target_per_week: target },
        }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      toast.success("Template salvo", `"${tplName}" disponível pra novos hábitos`);
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        emoji,
        color,
        target_per_week: Math.max(1, Math.min(7, target)),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-fg">
            {isEdit ? "Editar hábito" : "Novo hábito"}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-fg-muted hover:bg-bg-hover hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {!isEdit && templates.length > 0 && (
            <div>
              <label className="label flex items-center gap-1.5">
                <Bookmark className="h-3 w-3" />
                Templates salvos
              </label>
              <div className="flex flex-wrap gap-1">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-[11px] text-accent hover:bg-accent/15"
                  >
                    {t.data.emoji ?? "✨"} {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ler 30 minutos"
              autoFocus
              className="input"
            />
          </div>

          <div>
            <label className="label">Emoji</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-xl transition-colors",
                    emoji === e
                      ? "border-accent bg-accent/15"
                      : "border-border bg-bg-subtle hover:bg-bg-hover",
                  )}
                >
                  {e}
                </button>
              ))}
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                className="h-9 w-16 rounded-lg border border-border bg-bg-subtle px-2 text-center text-lg"
              />
            </div>
          </div>

          <div>
            <label className="label">Cor</label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform",
                    c.class,
                    color === c.id && "ring-2 ring-fg/40 ring-offset-2 ring-offset-bg-card scale-110",
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Meta semanal</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={7}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="flex-1"
              />
              <span className="font-mono text-sm text-fg w-16">
                {target} / 7 dias
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-bg-subtle/40 px-5 py-3">
          <button
            onClick={saveAsTemplate}
            disabled={!name.trim()}
            className="btn-secondary py-1.5 text-xs"
            title="Salvar configuração como template"
          >
            <BookmarkPlus className="h-3 w-3" />
            Salvar template
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary py-1.5 text-xs">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="btn-primary py-1.5 text-xs"
            >
              {saving ? "Salvando..." : isEdit ? "Salvar" : "Criar hábito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
