"use client";

import { useEffect, useState } from "react";
import {
  subscribe,
  getRemainingSeconds,
  getProgressPct,
  type PomodoroState,
} from "./pomodoro-store";

export function usePomodoroState() {
  const [state, setState] = useState<PomodoroState | null>(null);
  useEffect(() => subscribe(setState), []);
  return state;
}

export function useRemainingSeconds() {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    return subscribe((s) => {
      setRemaining(getRemainingSeconds(s));
    });
  }, []);
  return remaining;
}

export function useProgressPct() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    return subscribe((s) => {
      setPct(getProgressPct(s));
    });
  }, []);
  return pct;
}
