"use client";

import { Play, Pause, RotateCcw, SkipForward, Brain, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  start,
  pause,
  resume,
  reset,
  complete,
  configureSession,
  PomodoroLabels,
  PomodoroDefaults,
  type SessionType,
} from "@/lib/pomodoro-store";
import { usePomodoroState, useRemainingSeconds, useProgressPct } from "@/lib/use-pomodoro";

const TYPE_COLORS: Record<SessionType, { bg: string; text: string }> = {
  focus: { bg: "bg-accent", text: "text-accent" },
  short_break: { bg: "bg-success", text: "text-success" },
  long_break: { bg: "bg-warning", text: "text-warning" },
};

export function PomodoroTimer({ onSessionComplete }: { onSessionComplete: () => void }) {
  const state = usePomodoroState();
  const remaining = useRemainingSeconds();
  const progress = useProgressPct();

  if (!state) return null;

  const colors = TYPE_COLORS[state.type];
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const running = state.status === "running";
  const idle = state.status === "idle";

  function handleStart() {
    if (!state) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    if (state.status === "paused") resume();
    else start();
  }

  function handleSkip() {
    complete().then(() => onSessionComplete());
  }

  function changeType(t: SessionType) {
    if (!idle) {
      if (!confirm("Tem uma sessão em andamento — descartar?")) return;
      reset();
    }
    configureSession(t, PomodoroDefaults[t]);
  }

  function changeDuration(min: number) {
    if (!idle || !state) return;
    configureSession(state.type, min);
  }

  return (
    <div className="card flex flex-col items-center gap-6 py-10">
      {/* Tipo selector */}
      <div className="flex gap-1 rounded-full border border-border bg-bg-subtle p-1">
        {(Object.keys(PomodoroLabels) as SessionType[]).map((t) => (
          <button
            key={t}
            onClick={() => changeType(t)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              state.type === t ? "bg-bg-card text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {PomodoroLabels[t]}
          </button>
        ))}
      </div>

      {/* Timer circular */}
      <div className="relative">
        <svg className="h-64 w-64 -rotate-90">
          <circle cx="128" cy="128" r="120" stroke="hsl(220 14% 14%)" strokeWidth="8" fill="none" />
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 120}`}
            strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className={cn(colors.text, "transition-[stroke-dashoffset] duration-1000 ease-linear")}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-fg">
            {display}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-fg-muted">
            {state.type === "focus" ? (
              <>
                <Brain className="h-3.5 w-3.5" /> Sessão de foco
              </>
            ) : (
              <>
                <Coffee className="h-3.5 w-3.5" /> {PomodoroLabels[state.type]}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          disabled={idle}
          className="rounded-full p-2 text-fg-muted hover:bg-bg-hover hover:text-fg disabled:opacity-30"
          aria-label="Resetar"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={running ? pause : handleStart}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105",
            colors.bg,
          )}
          aria-label={running ? "Pausar" : "Iniciar"}
        >
          {running ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
        </button>
        <button
          onClick={handleSkip}
          disabled={idle}
          className="rounded-full p-2 text-fg-muted hover:bg-bg-hover hover:text-fg disabled:opacity-30"
          aria-label="Pular"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Configuração rápida */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-fg-muted">
        <span>Duração:</span>
        {[15, 25, 45, 60].map((min) => (
          <button
            key={min}
            onClick={() => changeDuration(min)}
            disabled={!idle}
            className={cn(
              "rounded-full border px-2.5 py-0.5 transition-colors",
              state.durationMin === min
                ? "border-accent bg-accent/15 text-accent"
                : "border-border hover:border-border-strong",
              !idle && "opacity-50",
            )}
          >
            {min}min
          </button>
        ))}
      </div>
    </div>
  );
}
