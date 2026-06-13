"use client";

import { useEffect, useState } from "react";
import { Palette, Check, Sun, Moon } from "lucide-react";
import {
  THEMES,
  getStoredTheme,
  setStoredTheme,
  getStoredMode,
  setStoredMode,
  type ThemeId,
  type ThemeMode,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const [current, setCurrent] = useState<ThemeId>("purple");
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrent(getStoredTheme());
    setMode(getStoredMode());
  }, []);

  function handlePick(id: ThemeId) {
    setCurrent(id);
    setStoredTheme(id);
  }

  function handleMode(next: ThemeMode) {
    setMode(next);
    setStoredMode(next);
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-fg">Tema</h2>
          <p className="text-xs text-fg-muted">Cor de destaque do app (aplicada em tempo real)</p>
        </div>
      </header>

      {/* Dark / light mode */}
      <div className="mb-4">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-fg-muted">Modo</div>
        <div className="flex gap-1 rounded-full border border-border bg-bg-subtle p-1">
          <button
            onClick={() => handleMode("dark")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
              mounted && mode === "dark"
                ? "bg-bg-card text-fg shadow-sm"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <Moon className="h-3 w-3" /> Escuro
          </button>
          <button
            onClick={() => handleMode("light")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
              mounted && mode === "light"
                ? "bg-bg-card text-fg shadow-sm"
                : "text-fg-muted hover:text-fg",
            )}
          >
            <Sun className="h-3 w-3" /> Claro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Object.values(THEMES).map((t) => {
          const isActive = mounted && current === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handlePick(t.id)}
              className={cn(
                "group flex flex-col items-center gap-1.5 rounded-lg border bg-bg-subtle p-2.5 transition-all",
                isActive ? "border-fg/30 ring-2 ring-fg/20" : "border-border hover:border-border-strong",
              )}
              aria-label={t.label}
            >
              <span
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:scale-105",
                )}
                style={{ background: t.preview }}
              >
                {isActive && <Check className="h-3.5 w-3.5 text-white" />}
              </span>
              <span className="text-[11px] text-fg-muted">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
