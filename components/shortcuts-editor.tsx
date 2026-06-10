"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, RotateCcw, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/dialogs";
import {
  getShortcutsConfig,
  setShortcutsConfig,
  accelFromEvent,
  prettyAccel,
  isValidAccel,
  SHORTCUT_LABELS,
  DEFAULT_SHORTCUTS,
  type ShortcutsConfig,
  type ShortcutId,
} from "@/lib/keyboard-shortcuts";

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("shortcuts-updated"));
  }
}

export function ShortcutsEditor() {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<ShortcutsConfig>(DEFAULT_SHORTCUTS);
  const [capturingId, setCapturingId] = useState<ShortcutId | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConfig(getShortcutsConfig());
    const api = (window as unknown as { electron?: { isElectron?: boolean } }).electron;
    setIsElectron(!!api?.isElectron);
  }, []);

  function save(next: ShortcutsConfig) {
    setConfig(next);
    setShortcutsConfig(next);
    emitChange();
  }

  function handleCapture(id: ShortcutId, accel: string) {
    if (!isValidAccel(accel)) {
      toast.error("Atalho inválido", "Use ao menos um modificador (Ctrl, Alt, Shift)");
      return;
    }
    // Detecta conflito com outro shortcut
    const conflictId = (Object.keys(config) as ShortcutId[]).find(
      (k) => k !== id && config[k] === accel,
    );
    if (conflictId) {
      toast.error(
        "Conflito",
        `Esse atalho já tá em uso por "${SHORTCUT_LABELS[conflictId]}". Mude o outro primeiro.`,
      );
      return;
    }
    save({ ...config, [id]: accel });
    toast.success("Atalho atualizado", prettyAccel(accel));
  }

  async function resetAll() {
    const ok = await confirmDialog({
      title: "Resetar atalhos pro padrão?",
      confirmLabel: "Resetar",
    });
    if (!ok) return;
    save({ ...DEFAULT_SHORTCUTS });
    toast.success("Atalhos resetados");
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Keyboard className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Atalhos de teclado</h2>
          <p className="text-xs text-fg-muted">
            Atalhos globais (funcionam mesmo com o app minimizado)
          </p>
        </div>
        <button
          onClick={resetAll}
          className="text-[11px] text-fg-muted hover:text-fg"
          title="Resetar pro padrão"
        >
          <RotateCcw className="h-3 w-3 inline mr-1" />
          Resetar
        </button>
      </header>

      {!isElectron && mounted && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Atalhos globais só funcionam no app Electron. No browser ficam inativos.</span>
        </div>
      )}

      {mounted && (
        <div className="space-y-2">
          {(Object.keys(SHORTCUT_LABELS) as ShortcutId[]).map((id) => (
            <ShortcutRow
              key={id}
              id={id}
              label={SHORTCUT_LABELS[id]}
              value={config[id]}
              isCapturing={capturingId === id}
              onStartCapture={() => setCapturingId(id)}
              onStopCapture={() => setCapturingId(null)}
              onCapture={(accel) => {
                handleCapture(id, accel);
                setCapturingId(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShortcutRow({
  id,
  label,
  value,
  isCapturing,
  onStartCapture,
  onStopCapture,
  onCapture,
}: {
  id: ShortcutId;
  label: string;
  value: string;
  isCapturing: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onCapture: (accel: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isCapturing) return;
    ref.current?.focus();

    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        onStopCapture();
        return;
      }
      const accel = accelFromEvent(e);
      if (accel) onCapture(accel);
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isCapturing, onCapture, onStopCapture]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2">
      <div className="flex-1 text-sm text-fg">{label}</div>
      <button
        ref={ref}
        onClick={isCapturing ? onStopCapture : onStartCapture}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
          isCapturing
            ? "border-accent bg-accent/15 text-accent animate-pulse"
            : "border-border bg-bg-card text-fg hover:border-accent/40",
        )}
        title={id}
      >
        {isCapturing ? (
          <>
            <span>Pressione...</span>
            <X
              className="h-3 w-3 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onStopCapture();
              }}
            />
          </>
        ) : (
          <span>{prettyAccel(value)}</span>
        )}
      </button>
    </div>
  );
}
