"use client";

import { useEffect, useState } from "react";
import { Key, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SdkPlaceholder } from "@/lib/sdk/types";

export type PlaceholderEntry = {
  name: string;
  meta: SdkPlaceholder;
};

type Values = Record<string, string>;

const STORAGE_PREFIX = "sdk-placeholder-";

export function loadPlaceholderValue(name: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_PREFIX + name) ?? "";
}

export function savePlaceholderValue(name: string, value: string) {
  if (typeof window === "undefined") return;
  if (value === "") localStorage.removeItem(STORAGE_PREFIX + name);
  else localStorage.setItem(STORAGE_PREFIX + name, value);
}

export function PlaceholderModal({
  required,
  onCancel,
  onConfirm,
}: {
  required: PlaceholderEntry[];
  onCancel: () => void;
  onConfirm: (values: Values) => void;
}) {
  const [values, setValues] = useState<Values>(() => {
    const v: Values = {};
    for (const p of required) v[p.name] = loadPlaceholderValue(p.name);
    return v;
  });
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const allFilled = required.every((p) => (values[p.name] ?? "").trim() !== "");

  function handleConfirm() {
    if (!allFilled) return;
    // Persiste pra próxima vez
    for (const p of required) savePlaceholderValue(p.name, values[p.name].trim());
    onConfirm(values);
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Configurar credenciais do SDK</h3>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-fg-muted">
            Alguns componentes selecionados precisam de credenciais. Os valores ficam só no teu app
            (localStorage) — não são enviados pra lugar nenhum.
          </p>

          {required.map((p) => {
            const isRevealed = reveal[p.name];
            return (
              <div key={p.name}>
                <label className="label flex items-center justify-between">
                  <span className="font-mono text-[11px]">{p.name}</span>
                  {p.meta.secret && (
                    <button
                      type="button"
                      onClick={() => setReveal((r) => ({ ...r, [p.name]: !r[p.name] }))}
                      className="flex items-center gap-1 text-[10px] text-fg-muted hover:text-fg"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="h-3 w-3" /> Esconder
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> Mostrar
                        </>
                      )}
                    </button>
                  )}
                </label>
                <div className="mt-1 text-xs text-fg-muted">{p.meta.label}</div>
                <input
                  type={p.meta.secret && !isRevealed ? "password" : "text"}
                  value={values[p.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
                  autoComplete="off"
                  className="input mt-1.5"
                  placeholder={p.meta.secret ? "••••" : ""}
                />
                {p.meta.description && (
                  <div className="mt-1 text-[11px] text-fg-subtle">{p.meta.description}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-bg-subtle/40 px-5 py-3">
          <button onClick={onCancel} className="text-xs text-fg-subtle hover:text-fg">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allFilled}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
              allFilled
                ? "bg-accent text-fg-on-accent hover:bg-accent-hover"
                : "bg-bg-hover text-fg-subtle",
            )}
          >
            Salvar e instalar
          </button>
        </div>
      </div>
    </div>
  );
}
