"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isStreakWarningEnabled,
  setStreakWarningEnabled,
  getStreakWarningHour,
  setStreakWarningHour,
} from "@/lib/streak-warning-config";

export function StreakWarningSettings() {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState(20);

  useEffect(() => {
    setMounted(true);
    setEnabled(isStreakWarningEnabled());
    setHour(getStreakWarningHour());
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setStreakWarningEnabled(next);
  }

  function onHour(v: number) {
    setHour(v);
    setStreakWarningHour(v);
  }

  return (
    <div className="card">
      <header className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
          <Flame className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Alerta de streak</h2>
          <p className="text-xs text-fg-muted">
            Notificação a partir do horário escolhido se a streak está em risco
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={!mounted}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            enabled ? "bg-accent" : "bg-bg-hover",
          )}
          aria-label={enabled ? "Desligar" : "Ligar"}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </header>

      {mounted && enabled && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-fg-muted">Notificar a partir de</span>
            <span className="font-mono text-fg">{String(hour).padStart(2, "0")}:00</span>
          </div>
          <input
            type="range"
            min={12}
            max={23}
            step={1}
            value={hour}
            onChange={(e) => onHour(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      )}
    </div>
  );
}
