"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { subscribeDialogs, type ActiveDialog } from "@/lib/dialogs";

// Renderiza o diálogo ativo (confirm/prompt/alert) disparado via lib/dialogs.ts.
// Montar uma vez por janela (layout), igual o <Toaster />.
export function DialogHost() {
  const [dialogs, setDialogs] = useState<ActiveDialog[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return subscribeDialogs(setDialogs);
  }, []);

  if (!mounted || dialogs.length === 0) return null;
  const dialog = dialogs[0];

  return createPortal(<DialogView key={dialog.id} dialog={dialog} />, document.body);
}

function DialogView({ dialog }: { dialog: ActiveDialog }) {
  const [value, setValue] = useState(
    dialog.kind === "prompt" ? (dialog.opts.initial ?? "") : "",
  );

  function cancel() {
    if (dialog.kind === "confirm") dialog.resolve(false);
    else if (dialog.kind === "prompt") dialog.resolve(null);
    else dialog.resolve();
  }

  function confirm() {
    if (dialog.kind === "confirm") dialog.resolve(true);
    else if (dialog.kind === "prompt") dialog.resolve(value);
    else dialog.resolve();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        confirm();
      }
    }
    // Capture pra não vazar pros modais de baixo (ex: card-modal fecha no Esc)
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog, value]);

  const danger = dialog.kind === "confirm" && dialog.opts.danger;
  const confirmLabel =
    dialog.kind === "confirm"
      ? (dialog.opts.confirmLabel ?? "Confirmar")
      : dialog.kind === "prompt"
        ? (dialog.opts.submitLabel ?? "Salvar")
        : "Ok";

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && cancel()}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-bg-card p-4 shadow-2xl">
        <h3 className="text-sm font-semibold text-fg">{dialog.opts.title}</h3>
        {dialog.opts.description && (
          <p className="mt-1 text-xs text-fg-muted">{dialog.opts.description}</p>
        )}

        {dialog.kind === "prompt" && (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dialog.opts.placeholder}
            autoFocus
            onFocus={(e) => e.target.select()}
            className="input mt-3 w-full text-sm"
          />
        )}

        <div className="mt-4 flex justify-end gap-2">
          {dialog.kind !== "alert" && (
            <button onClick={cancel} className="btn-secondary py-1.5 text-xs">
              Cancelar
            </button>
          )}
          <button
            onClick={confirm}
            autoFocus={dialog.kind !== "prompt"}
            className={cn(
              danger
                ? "btn border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger hover:bg-danger/20"
                : "btn-primary py-1.5 text-xs",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
