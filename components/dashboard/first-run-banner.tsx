"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, X, ArrowRight } from "lucide-react";

const DISMISS_KEY = "first-run-banner-dismissed";

type CredView = { set: boolean };
type CredentialsResp = {
  ok: boolean;
  credentials?: Record<string, CredView>;
};

function isDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().slice(0, 10);
  return localStorage.getItem(DISMISS_KEY) === today;
}

export function FirstRunBanner() {
  const [missing, setMissing] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isDismissedToday()) {
      setDismissed(true);
      return;
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: CredentialsResp) => {
        if (!data?.ok || !data.credentials) return;
        const required = ["GITHUB_TOKEN", "GITHUB_USERNAME"];
        const out: string[] = [];
        for (const k of required) {
          if (!data.credentials[k]?.set) out.push(k);
        }
        setMissing(out);
      })
      .catch(() => {
        /* ignora — não mostra banner sem dados */
      });
  }, []);

  function handleDismiss() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(DISMISS_KEY, today);
    setDismissed(true);
  }

  if (dismissed || missing.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">Configure suas credenciais pra começar</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          Faltam {missing.length} item(ns):{" "}
          <span className="font-mono text-fg">{missing.join(", ")}</span>. Sem isso o sync e as
          integrações não funcionam.
        </p>
        <Link
          href="/settings#credenciais"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-warning hover:underline"
        >
          Ir pra configurações
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        className="rounded-lg p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
        title="Dispensar até amanhã"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
