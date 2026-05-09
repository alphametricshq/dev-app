"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Keyboard, X } from "lucide-react";
import { subscribeHelp, closeHelp } from "@/lib/help-modal";
import { SHORTCUTS } from "@/lib/shortcuts";

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return subscribeHelp(setOpen);
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, typeof SHORTCUTS> = {};
    for (const s of SHORTCUTS) {
      if (!g[s.category]) g[s.category] = [];
      g[s.category].push(s);
    }
    return g;
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && closeHelp()}
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-fg">Atalhos de teclado</h2>
          </div>
          <button onClick={closeHelp} className="rounded p-1 text-fg-muted hover:bg-bg-hover hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                {category}
              </h3>
              <ul className="space-y-1.5">
                {items.map((s) => (
                  <li
                    key={s.keys.join("-") + s.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-fg-muted">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="rounded border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-fg"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="border-t border-border bg-bg-subtle/40 px-5 py-2 text-[11px] text-fg-subtle">
          Atalhos não funcionam quando você está digitando em um input ou textarea.
        </div>
      </div>
    </div>,
    document.body,
  );
}
