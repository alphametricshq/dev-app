"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Download, ArrowRight } from "lucide-react";

const SKIP_KEY = "onboarding-skipped";
const DONE_KEY = "onboarding-done";

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SKIP_KEY) !== "1" && localStorage.getItem(DONE_KEY) !== "1";
}

export function OnboardingWizard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldShow()) setOpen(true);
  }, []);

  function skip() {
    localStorage.setItem(SKIP_KEY, "1");
    setOpen(false);
  }

  function goSdk() {
    // Marca como visto (não volta a aparecer) e leva pra tela de instalação granular
    localStorage.setItem(DONE_KEY, "1");
    setOpen(false);
    router.push("/sdk");
  }

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && skip()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl">
        <div className="relative border-b border-border bg-gradient-to-br from-accent/15 to-bg-card px-6 py-6">
          <button
            onClick={skip}
            className="absolute right-4 top-4 rounded-lg p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
            aria-label="Pular"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/25 text-accent">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg">Bem-vindo à Alphametrics 👋</h2>
              <p className="text-xs text-fg-muted">
                Vamos deixar teu ambiente pronto pra trabalhar.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-fg-muted">
            O SDK Alphametrics instala tudo que tu precisa de uma vez:
          </p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-start gap-2 text-fg-muted">
              <span className="mt-0.5 text-accent">▸</span>
              <span>
                <strong className="text-fg">Skills e Agents</strong> do Claude Code (criar handoff,
                auditar Firebird, validar números WhatsApp...)
              </span>
            </li>
            <li className="flex items-start gap-2 text-fg-muted">
              <span className="mt-0.5 text-accent">▸</span>
              <span>
                <strong className="text-fg">MCPs</strong> configurados (Supabase, clientes, infra)
              </span>
            </li>
            <li className="flex items-start gap-2 text-fg-muted">
              <span className="mt-0.5 text-accent">▸</span>
              <span>
                <strong className="text-fg">Obsidian</strong> + vault de trabalho com contexto dos
                clientes
              </span>
            </li>
            <li className="flex items-start gap-2 text-fg-muted">
              <span className="mt-0.5 text-accent">▸</span>
              <span>
                <strong className="text-fg">Apps externos</strong> (Git, Claude Code CLI) se
                faltarem
              </span>
            </li>
          </ul>
          <p className="text-[11px] text-fg-subtle">
            O SDK detecta o que tu já tem e só instala o que falta. Pode rodar quantas vezes
            quiser.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-bg-subtle/40 px-6 py-3">
          <button onClick={skip} className="text-xs text-fg-subtle hover:text-fg">
            Pular por agora
          </button>
          <button
            onClick={goSdk}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar SDK
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
