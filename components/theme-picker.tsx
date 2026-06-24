"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { getStoredMode, setStoredMode, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMode(getStoredMode());
  }, []);

  function handleMode(next: ThemeMode) {
    setMode(next);
    setStoredMode(next);
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          {mode === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </div>
        <div>
          <h2 className="text-base font-semibold text-fg">Aparência</h2>
          <p className="text-xs text-fg-muted">
            Identidade Alphametrics (Verde Neon). Escolhe modo claro ou escuro.
          </p>
        </div>
      </header>

      <div className="flex gap-1 rounded-full border border-border bg-bg-subtle p-1">
        <button
          onClick={() => handleMode("dark")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
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
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
            mounted && mode === "light"
              ? "bg-bg-card text-fg shadow-sm"
              : "text-fg-muted hover:text-fg",
          )}
        >
          <Sun className="h-3 w-3" /> Claro
        </button>
      </div>
    </div>
  );
}
