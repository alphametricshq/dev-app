"use client";

import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, Brain, Coffee, KanbanSquare, Link2Off, Maximize2, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { confirmDialog } from "@/lib/dialogs";
import {
  start,
  pause,
  resume,
  reset,
  complete,
  configureSession,
  setSessionCard,
  PomodoroLabels,
  PomodoroDefaults,
  type SessionType,
} from "@/lib/pomodoro-store";
import { usePomodoroState, useRemainingSeconds, useProgressPct } from "@/lib/use-pomodoro";
import { CardSelector } from "./card-selector";
import { DeepFocusOverlay } from "./deep-focus-overlay";

const TYPE_COLORS: Record<SessionType, { bg: string; text: string }> = {
  focus: { bg: "bg-accent", text: "text-accent" },
  short_break: { bg: "bg-success", text: "text-success" },
  long_break: { bg: "bg-warning", text: "text-warning" },
};

type ElectronAPI = {
  isElectron?: boolean;
  openPomodoroOverlay?: () => void;
};

export function PomodoroTimer({ onSessionComplete }: { onSessionComplete: () => void }) {
  const state = usePomodoroState();
  const remaining = useRemainingSeconds();
  const progress = useProgressPct();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [deepFocus, setDeepFocus] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const api = (window as unknown as { electron?: ElectronAPI }).electron;
    if (api?.isElectron) setIsElectron(true);
  }, []);

  function openOverlay() {
    const api = (window as unknown as { electron?: ElectronAPI }).electron;
    api?.openPomodoroOverlay?.();
  }

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

  async function changeType(t: SessionType) {
    if (!idle) {
      const ok = await confirmDialog({
        title: "Tem uma sessão em andamento — descartar?",
        confirmLabel: "Descartar",
        danger: true,
      });
      if (!ok) return;
      reset();
    }
    configureSession(t, PomodoroDefaults[t]);
  }

  function changeDuration(min: number) {
    if (!idle || !state) return;
    configureSession(state.type, min);
  }

  return (
    <div className="card relative flex flex-col items-center gap-6 py-10">
      {/* Botões no canto superior direito */}
      <div className="absolute right-4 top-4 flex items-center gap-1.5">
        {isElectron && (
          <button
            onClick={openOverlay}
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-[11px] text-fg-muted transition-colors hover:border-accent hover:text-accent"
            title="Fixar no topo da tela (overlay always-on-top)"
          >
            <Pin className="h-3 w-3" />
            Fixar no topo
          </button>
        )}
        <button
          onClick={() => setDeepFocus(true)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-[11px] text-fg-muted transition-colors hover:border-accent hover:text-accent"
          title="Modo foco profundo"
        >
          <Maximize2 className="h-3 w-3" />
          Foco profundo
        </button>
      </div>
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

      {/* Vinculo com card */}
      {state.cardId && state.cardName ? (
        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs">
          <KanbanSquare className="h-3.5 w-3.5 shrink-0 text-warning" />
          <span className="flex-1 truncate text-fg">{state.cardName}</span>
          <button
            onClick={() => setSessionCard(null, null)}
            className="rounded p-1 text-fg-subtle hover:text-danger"
            aria-label="Desvincular"
          >
            <Link2Off className="h-3 w-3" />
          </button>
        </div>
      ) : state.type === "focus" ? (
        <button
          onClick={() => setSelectorOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
        >
          <KanbanSquare className="h-3 w-3" />
          Vincular card do board
        </button>
      ) : null}

      {selectorOpen && (
        <CardSelector
          onClose={() => setSelectorOpen(false)}
          onSelect={(card) => {
            setSessionCard(card.id, card.name);
            setSelectorOpen(false);
          }}
        />
      )}

      <DeepFocusOverlay
        open={deepFocus}
        onClose={() => setDeepFocus(false)}
        onSessionComplete={onSessionComplete}
      />
    </div>
  );
}
