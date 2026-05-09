"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitWithStats } from "@/lib/db/habits-queries";

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
  const isEdit = !!initial;

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

        <div className="flex justify-end gap-2 border-t border-border bg-bg-subtle/40 px-5 py-3">
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
  );
}
