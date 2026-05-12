"use client";

import { useEffect } from "react";
import { subscribe, getState, pause, resume, stop } from "@/lib/pomodoro-store";

type BridgeAPI = {
  isElectron?: boolean;
  isOverlay?: boolean;
  broadcastPomodoroState?: (state: unknown) => void;
  onPomodoroControl?: (cb: (action: string) => void) => () => void;
  onPomodoroStateRequest?: (cb: () => void) => () => void;
  updateTrayStatus?: (text: string) => void;
};

const TYPE_LABELS_BRIDGE: Record<string, string> = {
  focus: "Foco",
  short_break: "Pausa curta",
  long_break: "Pausa longa",
};

function formatPomodoroForTray(state: {
  status: string;
  type: string;
  durationMin: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
}): string {
  if (state.status === "idle") return "";
  const totalMs = state.durationMin * 60 * 1000;
  const reference = state.status === "paused" && state.pausedAt ? state.pausedAt : Date.now();
  const elapsedMs = reference - state.startedAt - state.pausedTotalMs;
  const remaining = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const display = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  const label = TYPE_LABELS_BRIDGE[state.type] ?? "Pomodoro";
  const pausedTag = state.status === "paused" ? " (pausado)" : "";
  return `${label}: ${display}${pausedTag}`;
}

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
      api.updateTrayStatus?.(formatPomodoroForTray(s));
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
