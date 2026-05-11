"use client";

import { useEffect } from "react";
import { subscribe, getState, pause, resume, stop } from "@/lib/pomodoro-store";

type BridgeAPI = {
  isElectron?: boolean;
  isOverlay?: boolean;
  broadcastPomodoroState?: (state: unknown) => void;
  onPomodoroControl?: (cb: (action: string) => void) => () => void;
  onPomodoroStateRequest?: (cb: () => void) => () => void;
};

/**
 * Ponte entre o pomodoro-store (no renderer principal) e o overlay (BrowserWindow separado).
 * Só roda no renderer principal (não no overlay). Apenas quando dentro do Electron.
 */
export function PomodoroElectronBridge() {
  useEffect(() => {
    const api = (window as unknown as { electron?: BridgeAPI }).electron;
    if (!api?.isElectron || api?.isOverlay) return;

    // Broadcast contínuo: cada emit do store envia o estado pro main
    const unsub = subscribe((s) => {
      api.broadcastPomodoroState?.(s);
    });

    // Quando overlay pede estado inicial (boot), broadcast o atual
    const offReq = api.onPomodoroStateRequest?.(() => {
      api.broadcastPomodoroState?.(getState());
    });

    // Controles enviados pelo overlay
    const offCtl = api.onPomodoroControl?.((action) => {
      if (action === "pause") pause();
      else if (action === "resume") resume();
      else if (action === "stop") stop();
    });

    return () => {
      unsub();
      offReq?.();
      offCtl?.();
    };
  }, []);

  return null;
}
