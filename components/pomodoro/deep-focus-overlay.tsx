"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, SkipForward, Minimize2, KanbanSquare, Brain, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  start,
  pause,
  resume,
  complete,
  PomodoroLabels,
  type SessionType,
} from "@/lib/pomodoro-store";
import { usePomodoroState, useRemainingSeconds, useProgressPct } from "@/lib/use-pomodoro";

const TYPE_RING: Record<SessionType, string> = {
  focus: "text-accent",
  short_break: "text-success",
  long_break: "text-warning",
};

export function DeepFocusOverlay({ open, onClose, onSessionComplete }: {
  open: boolean;
  onClose: () => void;
  onSessionComplete: () => void;
}) {
  const state = usePomodoroState();
  const remaining = useRemainingSeconds();
  const progress = useProgressPct();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === " ") {
        e.preventDefault();
        if (state?.status === "running") pause();
        else if (state?.status === "paused") resume();
        else start();
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, state?.status]);

  if (!open || !state || typeof window === "undefined") return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const running = state.status === "running";
  const idle = state.status === "idle";
  const ringClass = TYPE_RING[state.type];

  function handleSkip() {
    complete().then(() => {
      onSessionComplete();
    });
  }

  function handlePlayPause() {
    if (running) pause();
    else if (state?.status === "paused") resume();
    else start();
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg/95 backdrop-blur-2xl">
      {/* Sair (canto superior direito) */}
      <button
        onClick={onClose}
        className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs text-fg-muted hover:text-fg"
        aria-label="Sair do modo foco"
      >
        <Minimize2 className="h-3.5 w-3.5" />
        Sair (Esc)
      </button>

      {/* Tipo de sessão */}
      <div className="mb-6 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-fg-muted">
        {state.type === "focus" ? <Brain className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
        {PomodoroLabels[state.type]}
      </div>

      {/* Timer gigante com anel */}
      <div className="relative">
        <svg className="h-[28rem] w-[28rem] -rotate-90">
          <circle cx="224" cy="224" r="210" stroke="currentColor" strokeWidth="3" fill="none" className="text-border opacity-30" />
          <circle
            cx="224"
            cy="224"
            r="210"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 210}`}
            strokeDashoffset={`${2 * Math.PI * 210 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className={cn(ringClass, "transition-[stroke-dashoffset] duration-1000 ease-linear")}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-mono text-[10rem] font-light leading-none tabular-nums tracking-tight text-fg">
            {display}
          </div>
        </div>
      </div>

      {/* Card vinculado */}
      {state.cardName && (
        <div className="mt-8 flex max-w-md items-center gap-2 rounded-full border border-warning/30 bg-warning/5 px-4 py-1.5 text-sm">
          <KanbanSquare className="h-4 w-4 shrink-0 text-warning" />
          <span className="truncate text-fg">{state.cardName}</span>
        </div>
      )}

      {/* Controles minimalistas */}
      <div className="mt-10 flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full text-white shadow-2xl transition-transform hover:scale-105",
            state.type === "focus" ? "bg-accent" : state.type === "short_break" ? "bg-success" : "bg-warning"
          )}
          aria-label={running ? "Pausar" : "Iniciar"}
        >
          {running ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
        </button>
        <button
          onClick={handleSkip}
          disabled={idle}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg disabled:opacity-30"
          aria-label="Pular sessão"
        >
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      {/* Dica */}
      <div className="mt-12 text-[11px] uppercase tracking-[0.2em] text-fg-subtle">
        <kbd className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono text-[10px]">Espaço</kbd>{" "}
        play/pause ·{" "}
        <kbd className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>{" "}
        sair
      </div>
    </div>,
    document.body
  );
}
