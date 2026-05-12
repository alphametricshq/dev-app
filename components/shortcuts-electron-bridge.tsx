"use client";

import { useEffect } from "react";
import { getShortcutsConfig } from "@/lib/keyboard-shortcuts";

type API = {
  isElectron?: boolean;
  isOverlay?: boolean;
  isQuickCapture?: boolean;
  isQuickTask?: boolean;
  updateShortcuts?: (cfg: { globalQuickCapture: string; globalQuickTask: string }) => void;
};

/**
 * Envia os atalhos persistidos em localStorage pro main process do Electron
 * no boot da janela principal. Re-envia quando localStorage muda.
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

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("shortcuts-updated", onCustom);
    };
  }, []);

  return null;
}
