"use client";

import { useEffect, useState } from "react";
import { Github, Trello, Timer, ExternalLink, Save, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type CredView = { set: boolean; preview: string | null };
type CredsView = Record<string, CredView>;

type FormState = {
  GITHUB_USERNAME: string;
  GITHUB_TOKEN: string;
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_DONE_LIST_IDS: string;
  SYNC_INTERVAL_MIN: string;
};

const EMPTY_FORM: FormState = {
  GITHUB_USERNAME: "",
  GITHUB_TOKEN: "",
  TRELLO_API_KEY: "",
  TRELLO_TOKEN: "",
  TRELLO_DONE_LIST_IDS: "",
  SYNC_INTERVAL_MIN: "",
};

export function SettingsForm({ initialIntervalMin }: { initialIntervalMin: number }) {
  const [view, setView] = useState<CredsView>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) setView(data.credentials);
      })
      .finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    // Envia somente campos preenchidos (vazio = manter atual)
    const body: Partial<FormState> = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((k) => {
      if (form[k].trim() !== "") body[k] = form[k].trim();
    });

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Erro ao salvar");
      setView(data.credentials);
      setForm(EMPTY_FORM);
      setResult({ ok: true, msg: "Credenciais salvas. Próximo sync vai usar os valores novos." });
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : "Erro desconhecido" });
    } finally {
      setSaving(false);
    }
  }

  const ghOk = view.GITHUB_USERNAME?.set && view.GITHUB_TOKEN?.set;
  const trOk = view.TRELLO_API_KEY?.set && view.TRELLO_TOKEN?.set;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* GitHub */}
      <section className="card">
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
            <Github className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-fg">GitHub</h2>
            <p className="text-xs text-fg-muted">Sincroniza o gráfico de contribuições</p>
          </div>
          <StatusPill ok={!!ghOk} loading={loading} />
        </header>

        <div className="space-y-3">
          <Field
            label="Username"
            name="GITHUB_USERNAME"
            placeholder={view.GITHUB_USERNAME?.preview ?? "seu-usuario"}
            value={form.GITHUB_USERNAME}
            onChange={(v) => setField("GITHUB_USERNAME", v)}
            currentSet={view.GITHUB_USERNAME?.set}
          />
          <Field
            label="Personal Access Token"
            name="GITHUB_TOKEN"
            placeholder={view.GITHUB_TOKEN?.preview ?? "ghp_..."}
            value={form.GITHUB_TOKEN}
            onChange={(v) => setField("GITHUB_TOKEN", v)}
            currentSet={view.GITHUB_TOKEN?.set}
            secret
            showSecrets={showSecrets}
          />
        </div>

        <div className="mt-3 text-[11px] text-fg-subtle">
          Gere um token classic em{" "}
          <Ext href="https://github.com/settings/tokens">github.com/settings/tokens</Ext> com escopo{" "}
          <code className="codepill">read:user</code> (e <code className="codepill">repo</code> pra
          repos privados).
        </div>
      </section>

      {/* Trello */}
      <section className="card">
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
            <Trello className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-fg">Trello</h2>
            <p className="text-xs text-fg-muted">Sincroniza tarefas + permite gerenciar boards</p>
          </div>
          <StatusPill ok={!!trOk} loading={loading} />
        </header>

        <div className="space-y-3">
          <Field
            label="API Key"
            name="TRELLO_API_KEY"
            placeholder={view.TRELLO_API_KEY?.preview ?? ""}
            value={form.TRELLO_API_KEY}
            onChange={(v) => setField("TRELLO_API_KEY", v)}
            currentSet={view.TRELLO_API_KEY?.set}
            secret
            showSecrets={showSecrets}
          />
          <Field
            label="Token"
            name="TRELLO_TOKEN"
            placeholder={view.TRELLO_TOKEN?.preview ?? "ATTA..."}
            value={form.TRELLO_TOKEN}
            onChange={(v) => setField("TRELLO_TOKEN", v)}
            currentSet={view.TRELLO_TOKEN?.set}
            secret
            showSecrets={showSecrets}
          />
          <Field
            label="Done List IDs (opcional)"
            name="TRELLO_DONE_LIST_IDS"
            placeholder={view.TRELLO_DONE_LIST_IDS?.preview ?? "(detecção automática)"}
            value={form.TRELLO_DONE_LIST_IDS}
            onChange={(v) => setField("TRELLO_DONE_LIST_IDS", v)}
            currentSet={view.TRELLO_DONE_LIST_IDS?.set}
            hint="IDs de listas que representam Done, separadas por vírgula"
          />
        </div>

        <div className="mt-3 text-[11px] text-fg-subtle">
          1. <Ext href="https://trello.com/power-ups/admin/">trello.com/power-ups/admin</Ext> → cria
          Power-Up → aba <strong>API Key</strong>. 2. Clica no link <strong>Token</strong> → autoriza.
        </div>
      </section>

      {/* Auto-sync */}
      <section className="card">
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">Sincronização automática</h2>
            <p className="text-xs text-fg-muted">
              Atualmente: a cada {initialIntervalMin}min
            </p>
          </div>
        </header>

        <Field
          label="Intervalo (minutos)"
          name="SYNC_INTERVAL_MIN"
          placeholder={view.SYNC_INTERVAL_MIN?.preview ?? String(initialIntervalMin)}
          value={form.SYNC_INTERVAL_MIN}
          onChange={(v) => setField("SYNC_INTERVAL_MIN", v.replace(/\D/g, ""))}
          currentSet={view.SYNC_INTERVAL_MIN?.set}
          hint="Mínimo: 1"
        />
      </section>

      {/* Footer */}
      <div className="sticky bottom-0 -mx-8 flex items-center gap-3 border-t border-border bg-bg px-8 py-3">
        <button
          type="button"
          onClick={() => setShowSecrets((s) => !s)}
          className="text-xs text-fg-muted hover:text-fg flex items-center gap-1"
        >
          {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showSecrets ? "Esconder secrets digitados" : "Mostrar secrets digitados"}
        </button>
        {result && (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs",
              result.ok ? "text-success" : "text-danger",
            )}
          >
            {result.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {result.msg}
          </span>
        )}
        <button type="submit" disabled={saving} className="btn-primary ml-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar"}
        </button>
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
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  value,
  onChange,
  currentSet,
  hint,
  secret,
  showSecrets,
}: {
  label: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  currentSet?: boolean;
  hint?: string;
  secret?: boolean;
  showSecrets?: boolean;
}) {
  return (
    <div>
      <label className="label flex items-center justify-between">
        <span>{label}</span>
        {currentSet ? (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium normal-case text-success">
            configurado
          </span>
        ) : (
          <span className="rounded-full bg-fg-subtle/15 px-2 py-0.5 text-[10px] font-medium normal-case text-fg-muted">
            não configurado
          </span>
        )}
      </label>
      <input
        name={name}
        type={secret && !showSecrets ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="input"
      />
      {hint && <div className="mt-1 text-[11px] text-fg-subtle">{hint}</div>}
    </div>
  );
}

function StatusPill({ ok, loading }: { ok: boolean; loading: boolean }) {
  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-fg-subtle" />;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
      )}
    >
      {ok ? "Pronto" : "Falta configurar"}
    </span>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-accent underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
