"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward, Brain, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

type SessionType = "focus" | "short_break" | "long_break";

const DEFAULT_DURATIONS: Record<SessionType, number> = {
  focus: 25,
  short_break: 5,
  long_break: 15,
};

const TYPE_LABELS: Record<SessionType, string> = {
  focus: "Foco",
  short_break: "Pausa curta",
  long_break: "Pausa longa",
};

const TYPE_COLORS: Record<SessionType, { bg: string; ring: string; text: string }> = {
  focus: { bg: "bg-accent", ring: "ring-accent/40", text: "text-accent" },
  short_break: { bg: "bg-success", ring: "ring-success/40", text: "text-success" },
  long_break: { bg: "bg-warning", ring: "ring-warning/40", text: "text-warning" },
};

export function PomodoroTimer({
  onSessionComplete,
}: {
  onSessionComplete: () => void;
}) {
  const [type, setType] = useState<SessionType>("focus");
  const [durations, setDurations] = useState(DEFAULT_DURATIONS);
  const [secondsLeft, setSecondsLeft] = useState(durations.focus * 60);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = durations[type] * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const colors = TYPE_COLORS[type];

  const completeSession = useCallback(async () => {
    if (running) {
      setRunning(false);
      const finished = new Date();
      const started = startedAtRef.current ?? new Date(finished.getTime() - durations[type] * 60_000);
      try {
        const res = await fetch("/api/pomodoro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            duration_min: durations[type],
            started_at: started.toISOString().slice(0, 19).replace("T", " "),
            finished_at: finished.toISOString().slice(0, 19).replace("T", " "),
            completed: true,
          }),
        });
        const data = await res.json();
        if (data?.ok) {
          onSessionComplete();
          if (type === "focus") {
            toast.success(
              `Pomodoro completo! +15 XP`,
              `${durations[type]} minutos de foco registrados.`,
            );
          } else {
            toast.info("Pausa concluída", "Bora pro próximo foco?");
          }
          // Notificação nativa
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Pomodoro completo!", {
                body: `Sessão de ${TYPE_LABELS[type]} (${durations[type]}min) finalizada.`,
                silent: false,
              });
            }
          }
        }
      } catch {
        toast.error("Erro ao salvar sessão");
      }
    }
    setSecondsLeft(durations[type] * 60);
    startedAtRef.current = null;
  }, [running, type, durations, onSessionComplete]);

  // Tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Completa
          if (intervalRef.current) clearInterval(intervalRef.current);
          completeSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, completeSession]);

  // Atualiza secondsLeft quando duração ou tipo muda (e não está rodando)
  useEffect(() => {
    if (!running) setSecondsLeft(durations[type] * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, durations[type]]);

  function start() {
    if (!running) {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
      if (!startedAtRef.current) startedAtRef.current = new Date();
      setRunning(true);
    }
  }
  function pause() {
    setRunning(false);
  }
  function reset() {
    setRunning(false);
    setSecondsLeft(durations[type] * 60);
    startedAtRef.current = null;
  }
  function skip() {
    completeSession();
  }
  function changeType(t: SessionType) {
    if (running) {
      if (!confirm("Tem uma sessão em andamento — descartar?")) return;
    }
    setRunning(false);
    setType(t);
    startedAtRef.current = null;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="card flex flex-col items-center gap-6 py-10">
      {/* Tipo selector */}
      <div className="flex gap-1 rounded-full border border-border bg-bg-subtle p-1">
        {(Object.keys(TYPE_LABELS) as SessionType[]).map((t) => (
          <button
            key={t}
            onClick={() => changeType(t)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              type === t ? "bg-bg-card text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Timer circular */}
      <div className="relative">
        <svg className="h-64 w-64 -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="hsl(220 14% 14%)"
            strokeWidth="8"
            fill="none"
          />
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
            {type === "focus" ? (
              <>
                <Brain className="h-3.5 w-3.5" /> Sessão de foco
              </>
            ) : (
              <>
                <Coffee className="h-3.5 w-3.5" /> {TYPE_LABELS[type]}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          disabled={secondsLeft === durations[type] * 60 && !running}
          className="rounded-full p-2 text-fg-muted hover:bg-bg-hover hover:text-fg disabled:opacity-30"
          aria-label="Resetar"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={running ? pause : start}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105",
            colors.bg,
          )}
          aria-label={running ? "Pausar" : "Iniciar"}
        >
          {running ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
        </button>
        <button
          onClick={skip}
          className="rounded-full p-2 text-fg-muted hover:bg-bg-hover hover:text-fg"
          aria-label="Pular"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* Configuração rápida */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-fg-muted">
        <span>Duração:</span>
        {([
          [15, "15"],
          [25, "25"],
          [45, "45"],
          [60, "60"],
        ] as const).map(([min, label]) => (
          <button
            key={min}
            onClick={() => {
              if (running) return;
              setDurations({ ...durations, [type]: min });
            }}
            disabled={running}
            className={cn(
              "rounded-full border px-2.5 py-0.5 transition-colors",
              durations[type] === min
                ? "border-accent bg-accent/15 text-accent"
                : "border-border hover:border-border-strong",
              running && "opacity-50",
            )}
          >
            {label}min
          </button>
        ))}
      </div>
    </div>
  );
}
