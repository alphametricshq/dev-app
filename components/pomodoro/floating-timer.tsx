"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, Pause, X, Brain, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { pause, resume, stop, PomodoroLabels, type SessionType } from "@/lib/pomodoro-store";
import { usePomodoroState, useRemainingSeconds, useProgressPct } from "@/lib/use-pomodoro";

const TYPE_COLORS: Record<SessionType, { ring: string; bar: string; text: string; icon: typeof Brain }> = {
  focus: { ring: "stroke-accent", bar: "bg-accent", text: "text-accent", icon: Brain },
  short_break: { ring: "stroke-success", bar: "bg-success", text: "text-success", icon: Coffee },
  long_break: { ring: "stroke-warning", bar: "bg-warning", text: "text-warning", icon: Coffee },
};

export function FloatingTimer() {
  const pathname = usePathname();
  const state = usePomodoroState();
  const remaining = useRemainingSeconds();
  const progress = useProgressPct();

  // Esconde quando idle ou na página /foco (lá já tem o timer principal)
  if (!state || state.status === "idle" || pathname === "/foco") return null;

  const colors = TYPE_COLORS[state.type];
  const Icon = colors.icon;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const running = state.status === "running";

  function handleStop() {
    if (confirm("Parar a sessão atual?")) stop();
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-bg-card px-4 py-2 shadow-2xl backdrop-blur-sm">
      {/* Timer + label */}
      <Link href="/foco" className="flex items-center gap-2.5 text-fg hover:opacity-80">
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
        <div className="min-w-0 max-w-[160px]">
          <div className="font-mono text-sm font-semibold tabular-nums text-fg">{display}</div>
          <div className="truncate text-[10px] text-fg-muted">
            {state.cardName ? state.cardName : PomodoroLabels[state.type]}
          </div>
        </div>
      </Link>

      {/* Controles */}
      <div className="flex items-center gap-1 border-l border-border pl-2">
        <button
          onClick={() => (running ? pause() : resume())}
          className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-bg-hover hover:text-fg"
          aria-label={running ? "Pausar" : "Retomar"}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
        </button>
        <button
          onClick={handleStop}
          className="flex h-7 w-7 items-center justify-center rounded-full text-fg-muted hover:bg-danger/15 hover:text-danger"
          aria-label="Parar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
