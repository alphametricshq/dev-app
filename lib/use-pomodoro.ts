"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  subscribe,
  getState,
  getRemainingSeconds,
  getProgressPct,
  type PomodoroState,
} from "./pomodoro-store";

// Adapta subscribe (que passa o estado) pro contrato de useSyncExternalStore.
function subscribeReact(onChange: () => void): () => void {
  return subscribe(() => onChange());
}

// SSR snapshot: sempre retorna null pra que o FloatingTimer fique escondido no HTML inicial.
// Após hydrate, o React re-renderiza com o snapshot real do client (que vem do localStorage).
// O componente que consome deve esperar hydrate antes de renderizar o timer real.
function getServerSnapshot(): PomodoroState | null {
  return null;
}

export function usePomodoroState(): PomodoroState | null {
  return useSyncExternalStore(subscribeReact, getState, getServerSnapshot);
}

export function useRemainingSeconds() {
  const [remaining, setRemaining] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return getRemainingSeconds(getState());
  });
  useEffect(() => {
    setRemaining(getRemainingSeconds(getState()));
    return subscribe((s) => setRemaining(getRemainingSeconds(s)));
  }, []);
  return remaining;
}

export function useProgressPct() {
  const [pct, setPct] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return getProgressPct(getState());
  });
  useEffect(() => {
    setPct(getProgressPct(getState()));
    return subscribe((s) => setPct(getProgressPct(s)));
  }, []);
  return pct;
}
