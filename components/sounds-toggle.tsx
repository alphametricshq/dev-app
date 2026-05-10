"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isSoundsEnabled,
  setSoundsEnabled,
  playComplete,
  playLevelUp,
  playGoal,
} from "@/lib/sounds";

export function SoundsToggle() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnabled(isSoundsEnabled());
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSoundsEnabled(next);
    if (next) {
      // toca um som de teste pra confirmar
      playComplete();
    }
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          {enabled && mounted ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Sons</h2>
          <p className="text-xs text-fg-muted">
            Toca sons sintéticos quando pomodoro completa, sobe nível ou bate meta
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={!mounted}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            enabled ? "bg-accent" : "bg-bg-hover",
          )}
          aria-label={enabled ? "Desligar sons" : "Ligar sons"}
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
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => playComplete()} className="btn-secondary py-1.5 text-xs">
            <Play className="h-3 w-3" />
            Pomodoro completo
          </button>
          <button onClick={() => playLevelUp()} className="btn-secondary py-1.5 text-xs">
            <Play className="h-3 w-3" />
            Level up
          </button>
          <button onClick={() => playGoal()} className="btn-secondary py-1.5 text-xs">
            <Play className="h-3 w-3" />
            Meta batida
          </button>
        </div>
      )}
    </div>
  );
}
