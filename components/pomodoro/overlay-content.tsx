"use client";

import { useEffect, useState } from "react";
import { Play, Pause, X, Brain, Coffee, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { confirmDialog } from "@/lib/dialogs";
import type { PomodoroState, SessionType } from "@/lib/pomodoro-store";

type ElectronWindow = Window & {
  electron?: {
    isOverlay?: boolean;
    onPomodoroState?: (cb: (state: unknown) => void) => () => void;
    requestPomodoroState?: () => void;
    sendPomodoroControl?: (action: "pause" | "resume" | "stop") => void;
    closePomodoroOverlay?: () => void;
  };
};

const TYPE_COLORS: Record<SessionType, { ring: string; bar: string; text: string; icon: typeof Brain }> = {
  focus: { ring: "stroke-accent", bar: "bg-accent", text: "text-accent", icon: Brain },
  short_break: { ring: "stroke-success", bar: "bg-success", text: "text-success", icon: Coffee },
  long_break: { ring: "stroke-warning", bar: "bg-warning", text: "text-warning", icon: Coffee },
};

const TYPE_LABELS: Record<SessionType, string> = {
  focus: "Foco",
  short_break: "Pausa curta",
  long_break: "Pausa longa",
};

export function OverlayContent() {
  const [state, setState] = useState<PomodoroState | null>(null);

  useEffect(() => {
    const w = window as ElectronWindow;
    if (!w.electron?.onPomodoroState) return;
    const off = w.electron.onPomodoroState((s) => setState(s as PomodoroState));
    w.electron.requestPomodoroState?.();
    return () => {
      off();
    };
  }, []);

  if (!state || state.status === "idle") {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-2xl border border-border bg-bg-card text-xs text-fg-muted shadow-2xl"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        Sem sessão ativa
        <button
          onClick={() => (window as ElectronWindow).electron?.closePomodoroOverlay?.()}
          className="ml-2 rounded p-1 text-fg-subtle hover:bg-bg-hover hover:text-fg"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          aria-label="Fechar overlay"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const colors = TYPE_COLORS[state.type];
  const Icon = colors.icon;
  const remaining = computeRemaining(state);
  const progress = computeProgress(state);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const running = state.status === "running";

  function ctl(action: "pause" | "resume" | "stop") {
    (window as ElectronWindow).electron?.sendPomodoroControl?.(action);
  }

  function closeOverlay() {
    (window as ElectronWindow).electron?.closePomodoroOverlay?.();
  }

  return (
    <div
      className="flex h-full w-full items-center gap-3 rounded-2xl border border-border bg-bg-card px-3 shadow-2xl"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-9 w-9 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" stroke="hsl(220 14% 18%)" strokeWidth="3" fill="none" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 16}`}
              strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
              className={cn(colors.ring, "transition-[stroke-dashoffset] duration-1000 ease-linear")}
            />
          </svg>
          <Icon className={cn("relative h-4 w-4", colors.text)} />
        </div>
        <div className="min-w-0 max-w-[180px]">
          <div className="font-mono text-sm font-semibold tabular-nums text-fg">{display}</div>
          <div className="truncate text-[10px] text-fg-muted">
            {state.cardName ? state.cardName : TYPE_LABELS[state.type]}
          </div>
        </div>
      </div>

      <div
        className="ml-auto flex items-center gap-1 border-l border-border pl-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={() => ctl(running ? "pause" : "resume")}
          className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-bg-hover hover:text-fg"
          aria-label={running ? "Pausar" : "Retomar"}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
        </button>
        <button
          onClick={async () => {
            const ok = await confirmDialog({
              title: "Parar a sessão atual?",
              confirmLabel: "Parar",
            });
            if (ok) ctl("stop");
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-danger/15 hover:text-danger"
          aria-label="Parar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={closeOverlay}
          className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-bg-hover hover:text-fg"
          aria-label="Fechar overlay"
          title="Fechar overlay (timer continua rodando)"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function computeRemaining(s: PomodoroState): number {
  const totalMs = s.durationMin * 60 * 1000;
  if (s.status === "idle") return s.durationMin * 60;
  const reference = s.status === "paused" && s.pausedAt ? s.pausedAt : Date.now();
  const elapsedMs = reference - s.startedAt - s.pausedTotalMs;
  return Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
}

function computeProgress(s: PomodoroState): number {
  const total = s.durationMin * 60;
  const remaining = computeRemaining(s);
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
}
