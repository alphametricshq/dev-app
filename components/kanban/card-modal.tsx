"use client";

import { useEffect, useRef, useState } from "react";
import { X, Trash2, ExternalLink, AlignLeft } from "lucide-react";
import type { TrelloCardItem, TrelloListItem } from "@/lib/integrations/trello-api";

export function CardModal({
  card,
  list,
  onClose,
  onSave,
  onDelete,
}: {
  card: TrelloCardItem;
  list: TrelloListItem | undefined;
  onClose: () => void;
  onSave: (input: { name: string; desc: string }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(card.name);
  const [desc, setDesc] = useState(card.desc);
  const dialogRef = useRef<HTMLDivElement>(null);

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

        <div className="space-y-5 px-6 py-5">
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
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-bg-subtle/40 px-6 py-3">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm(`Apagar "${card.name}"?`)) {
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
