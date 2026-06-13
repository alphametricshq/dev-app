"use client";

import { useEffect } from "react";
import { getShortcutsConfig } from "@/lib/keyboard-shortcuts";
import { pause, resume, getState } from "@/lib/pomodoro-store";
import { toast } from "@/lib/toast";

type API = {
  isElectron?: boolean;
  isOverlay?: boolean;
  isQuickCapture?: boolean;
  isQuickTask?: boolean;
  updateShortcuts?: (cfg: {
    globalQuickCapture: string;
    globalQuickTask: string;
    globalPomodoroToggle: string;
  }) => void;
  onPomodoroToggleShortcut?: (cb: () => void) => () => void;
};

/**
 * Envia os atalhos persistidos em localStorage pro main process do Electron
 * no boot da janela principal. Re-envia quando localStorage muda.
 * Também escuta o trigger global de play/pause do pomodoro e age no store.
 */
export function ShortcutsElectronBridge() {
  useEffect(() => {
    const api = (window as unknown as { electron?: API }).electron;
    if (!api?.isElectron || api.isOverlay || api.isQuickCapture || api.isQuickTask) return;

    function push() {
      const cfg = getShortcutsConfig();
      api?.updateShortcuts?.(cfg);
    }
    push();

    // Re-aplica se o localStorage mudar (mesma janela ou outra)
    function onStorage(e: StorageEvent) {
      if (e.key === "keyboard-shortcuts-v1") push();
    }
    window.addEventListener("storage", onStorage);

    // Também escuta evento custom pra mudanças na mesma janela
    function onCustom() {
      push();
    }
    window.addEventListener("shortcuts-updated", onCustom);

    // Trigger global play/pause: alterna estado do pomodoro ativo.
    // Se idle: ignora silenciosamente (não faz sentido "iniciar" um pomo
    // sem contexto — tipo, qual duração? qual card?).
    const offToggle = api.onPomodoroToggleShortcut?.(() => {
      const s = getState();
      if (s.status === "running") {
        pause();
        toast.info("Pomodoro pausado", "Use o atalho de novo pra retomar");
      } else if (s.status === "paused") {
        resume();
        toast.info("Pomodoro retomado");
      }
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("shortcuts-updated", onCustom);
      offToggle?.();
    };
  }, []);

  return null;
}
