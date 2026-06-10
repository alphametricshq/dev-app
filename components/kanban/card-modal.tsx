"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trash2, ExternalLink, AlignLeft, Star, Brain, Tag, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardChecklists } from "./card-checklists";
import type { TrelloCardItem, TrelloListItem } from "@/lib/integrations/trello-api";
import type { PomodoroSession } from "@/lib/db/pomodoro-queries";
import { labelBg } from "@/lib/trello-labels";
import { toast } from "@/lib/toast";
import { confirmDialog, promptDialog } from "@/lib/dialogs";

export function CardModal({
  card,
  list,
  pinned,
  onClose,
  onSave,
  onDelete,
  onTogglePin,
}: {
  card: TrelloCardItem;
  list: TrelloListItem | undefined;
  pinned: boolean;
  onClose: () => void;
  onSave: (input: { name: string; desc: string }) => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [name, setName] = useState(card.name);
  const [desc, setDesc] = useState(card.desc);
  const [pomodoros, setPomodoros] = useState<PomodoroSession[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/pomodoro/card/${card.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        if (data?.ok && Array.isArray(data.sessions)) setPomodoros(data.sessions);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [card.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") commit();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, desc]);

  function commit() {
    const trimmedName = name.trim() || card.name;
    if (trimmedName !== card.name || desc !== card.desc) {
      onSave({ name: trimmedName, desc });
    }
    onClose();
  }

  async function saveAsTemplate() {
    const tplName = await promptDialog({
      title: "Salvar como template",
      description: "O card (com checklists) fica disponível pra reaproveitar depois.",
      placeholder: "Nome do template",
      initial: card.name,
      submitLabel: "Salvar",
    });
    if (!tplName?.trim()) return;
    try {
      // Pega checklists atuais do card
      const r = await fetch(`/api/trello/cards/${card.id}/checklists`);
      const d = await r.json();
      const checklists = (d?.checklists ?? []).map((cl: { name: string; checkItems: { name: string }[] }) => ({
        name: cl.name,
        items: cl.checkItems.map((i) => i.name),
      }));
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "card",
          name: tplName.trim(),
          data: { name, desc, checklists },
        }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      toast.success("Template salvo", `"${tplName}" disponível pra novos cards`);
    } catch (e) {
      toast.error("Erro ao salvar template", e instanceof Error ? e.message : String(e));
    }
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) commit();
  }

  return (
    <div
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-12 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl rounded-xl border border-border bg-bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex-1">
            <textarea
              value={name}
              onChange={(e) => setName(e.target.value)}
              rows={Math.max(1, name.split("\n").length)}
              className="w-full resize-none rounded-md border border-transparent bg-transparent text-lg font-semibold text-fg focus:border-accent focus:bg-bg-subtle focus:px-2 focus:py-1 focus:outline-none"
              autoFocus
            />
            {list && (
              <div className="mt-1 text-xs text-fg-muted">
                na lista <span className="text-fg">{list.name}</span>
              </div>
            )}
          </div>
          <button
            onClick={commit}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5" data-card-modal-body tabIndex={-1}>
          {card.labels && card.labels.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
                <Tag className="h-3.5 w-3.5" />
                Labels
              </div>
              <div className="flex flex-wrap gap-1.5">
                {card.labels.map((l) => (
                  <span
                    key={l.id}
                    className="rounded px-2 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: labelBg(l.color) }}
                  >
                    {l.name || l.color || "—"}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 text-[11px] text-fg-subtle">
                Edite labels diretamente no Trello
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
              <AlignLeft className="h-3.5 w-3.5" />
              Descrição
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Adicione uma descrição mais detalhada..."
              rows={Math.max(6, desc.split("\n").length + 1)}
              className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <div className="mt-1 text-[11px] text-fg-subtle">
              <kbd className="rounded bg-bg-hover px-1 py-0.5 font-mono">Esc</kbd> ou clique fora
              para salvar e fechar.
            </div>
          </div>

          <CardChecklists cardId={card.id} />

          {pomodoros.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
                <Brain className="h-3.5 w-3.5" />
                Pomodoros vinculados ({pomodoros.length})
              </div>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {pomodoros.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-1.5 text-xs"
                  >
                    <span className="text-fg">
                      {s.type === "focus" ? "Foco" : "Pausa"} ·{" "}
                      <span className="font-mono text-fg-muted">{s.duration_min}min</span>
                    </span>
                    <span className="font-mono text-[10px] text-fg-subtle">
                      {new Date(s.finished_at + "Z").toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-[11px] text-fg-subtle">
                Total focado:{" "}
                <span className="font-mono text-fg">
                  {pomodoros
                    .filter((s) => s.type === "focus")
                    .reduce((sum, s) => sum + s.duration_min, 0)}
                  min
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-bg-subtle/40 px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePin}
              className={cn(
                "btn flex items-center gap-1.5 py-1.5 text-xs border",
                pinned
                  ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
                  : "border-border bg-bg-subtle text-fg-muted hover:bg-bg-hover hover:text-fg",
              )}
            >
              <Star className={cn("h-3.5 w-3.5", pinned && "fill-warning")} />
              {pinned ? "Fixado" : "Fixar"}
            </button>
            {card.url && (
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary py-1.5 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir no Trello
              </a>
            )}
            <button
              onClick={saveAsTemplate}
              className="btn-secondary py-1.5 text-xs"
              title="Salvar este card como template reutilizável"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              Salvar template
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const ok = await confirmDialog({
                  title: `Apagar "${card.name}"?`,
                  confirmLabel: "Apagar",
                  danger: true,
                });
                if (ok) {
                  onDelete();
                  onClose();
                }
              }}
              className="btn flex items-center gap-1.5 border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 py-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Apagar
            </button>
            <button onClick={commit} className="btn-primary py-1.5 text-xs">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
