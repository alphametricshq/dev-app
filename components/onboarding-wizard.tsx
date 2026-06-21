"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  Github,
  Target,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SKIP_KEY = "onboarding-skipped";
const DONE_KEY = "onboarding-done";

type CredView = { set: boolean };
type CredentialsResp = {
  ok: boolean;
  credentials?: Record<string, CredView>;
};

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SKIP_KEY) !== "1" && localStorage.getItem(DONE_KEY) !== "1";
}

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ghReady, setGhReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!shouldShow()) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: CredentialsResp) => {
        if (!d?.ok || !d.credentials) return;
        const gh = !!d.credentials.GITHUB_TOKEN?.set && !!d.credentials.GITHUB_USERNAME?.set;
        setGhReady(gh);
        // Só mostra wizard se não tem credenciais E é primeira vez
        if (!gh) setOpen(true);
      })
      .catch(() => {});
  }, []);

  function close() {
    setOpen(false);
  }

  function skip() {
    localStorage.setItem(SKIP_KEY, "1");
    close();
  }

  function complete() {
    localStorage.setItem(DONE_KEY, "1");
    close();
  }

  if (!open) return null;

  const totalSteps = 3;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && skip()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="relative border-b border-border bg-gradient-to-br from-accent/10 to-bg-card px-6 py-5">
          <button
            onClick={skip}
            className="absolute right-4 top-4 rounded-lg p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
            aria-label="Pular onboarding"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg">Bem-vindo ao Dashboard Pessoal</h2>
              <p className="text-xs text-fg-muted">
                Vamos configurar em 1 minuto pra começar a metrificar produtividade.
              </p>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 py-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-accent" : i < step ? "w-1.5 bg-accent/50" : "w-1.5 bg-bg-hover",
              )}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="px-6 pb-6">
          {step === 0 && (
            <StepCard
              icon={Sparkles}
              title="O que é isso aqui?"
              body={
                <ul className="space-y-1.5 text-sm text-fg-muted">
                  <li>• <strong className="text-fg">Demandas</strong> · puxa o board do GitHub Project</li>
                  <li>• <strong className="text-fg">Foco</strong> · pomodoro com auto-sync de sessões</li>
                  <li>• <strong className="text-fg">Hábitos</strong> · trackeia rotina diária</li>
                  <li>• <strong className="text-fg">Conquistas</strong> · XP + badges baseado no que você faz</li>
                  <li>• <strong className="text-fg">Retrospectiva</strong> · resumo semanal com insights</li>
                </ul>
              }
            />
          )}
          {step === 1 && (
            <StepCard
              icon={Github}
              title="Conecta o GitHub"
              body={
                <div className="space-y-3 text-sm text-fg-muted">
                  <p>
                    O dashboard puxa contribuições + Project board da org. Precisa de um Personal
                    Access Token com escopos <code className="codepill">read:user</code>,{" "}
                    <code className="codepill">repo</code> e <code className="codepill">project</code>.
                  </p>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=read:user,repo,project&description=Dashboard%20Pessoal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    Gerar token <ExternalLink className="h-3 w-3" />
                  </a>
                  {ghReady === false && (
                    <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                      Token ainda não configurado — abre as configurações pra colar.
                    </p>
                  )}
                </div>
              }
              cta={
                <Link
                  href="/settings#credenciais"
                  onClick={complete}
                  className="btn-primary inline-flex py-1.5 text-xs"
                >
                  Abrir configurações
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          )}
          {step === 2 && (
            <StepCard
              icon={Target}
              title="Define sua meta diária"
              body={
                <div className="space-y-3 text-sm text-fg-muted">
                  <p>
                    Você pode ajustar a meta de contribuições diárias/semanais/mensais em{" "}
                    <strong className="text-fg">Configurações → Metas</strong>. Default: 40/dia.
                  </p>
                  <p className="text-xs text-fg-subtle">
                    A barra no rodapé do dashboard mostra progresso em tempo real.
                  </p>
                </div>
              }
              cta={
                <button onClick={complete} className="btn-primary py-1.5 text-xs">
                  Beleza, vamos lá!
                  <Check className="h-3.5 w-3.5" />
                </button>
              }
            />
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs">
          <button
            onClick={skip}
            className="text-fg-subtle hover:text-fg"
          >
            Pular tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-border bg-bg-subtle px-3 py-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
              >
                Voltar
              </button>
            )}
            {step < totalSteps - 1 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1 font-medium text-white hover:bg-accent-hover"
              >
                Próximo
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .codepill {
          background: hsl(220 14% 15%);
          border: 1px solid hsl(220 12% 24%);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-family: ui-monospace, monospace;
        }
      `}</style>
    </div>
  );
}

function StepCard({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: typeof Sparkles;
  title: string;
  body: React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-base font-semibold text-fg">{title}</h3>
      </div>
      <div>{body}</div>
      {cta && <div className="pt-2">{cta}</div>}
    </div>
  );
}
