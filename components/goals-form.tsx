"use client";

import { useEffect, useState } from "react";
import { Target, GitCommit, CheckSquare, Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/dialogs";

type GoalsConfig = {
  daily: { github: number; trello: number };
  weekly: { github: number; trello: number };
  monthly: { github: number; trello: number };
};

const PERIODS = [
  { id: "daily", label: "Diária" },
  { id: "weekly", label: "Semanal" },
  { id: "monthly", label: "Mensal" },
] as const;

export function GoalsForm() {
  const [goals, setGoals] = useState<GoalsConfig | null>(null);
  const [defaults, setDefaults] = useState<GoalsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          setGoals(data.goals);
          setDefaults(data.defaults);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function update(period: keyof GoalsConfig, source: "github" | "trello", value: number) {
    setGoals((prev) =>
      prev ? { ...prev, [period]: { ...prev[period], [source]: value } } : prev,
    );
    setDirty(true);
  }

  async function handleSave() {
    if (!goals) return;
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      toast.success("Metas atualizadas", "Refletido no dashboard imediatamente.");
      setDirty(false);
    } catch (e) {
      toast.error("Erro ao salvar", e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!defaults) return;
    const ok = await confirmDialog({
      title: "Voltar aos valores padrão?",
      confirmLabel: "Resetar",
    });
    if (!ok) return;
    setGoals(JSON.parse(JSON.stringify(defaults)));
    setDirty(true);
  }

  if (loading || !goals) {
    return (
      <div className="card flex h-32 items-center justify-center text-fg-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando metas...
      </div>
    );
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Target className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Metas customizáveis</h2>
          <p className="text-xs text-fg-muted">Editar valores afeta /conquistas e visão geral imediatamente</p>
        </div>
        {dirty && (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
            não salvo
          </span>
        )}
      </header>

      <div className="space-y-4">
        {PERIODS.map((period) => (
          <div key={period.id} className="rounded-lg border border-border bg-bg-subtle p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
              {period.label}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                icon={<GitCommit className="h-3.5 w-3.5 text-success" />}
                label="GitHub"
                value={goals[period.id].github}
                onChange={(v) => update(period.id, "github", v)}
              />
              <NumberField
                icon={<CheckSquare className="h-3.5 w-3.5 text-warning" />}
                label="Trello"
                value={goals[period.id].trello}
                onChange={(v) => update(period.id, "trello", v)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={handleReset}
          type="button"
          className="btn-secondary py-1.5 text-xs"
          disabled={saving}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar padrão
        </button>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="btn-primary py-1.5 text-xs"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar metas
        </button>
      </div>
    </div>
  );
}

function NumberField({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-fg-muted">
        {icon}
        <span>{label}</span>
      </div>
      <input
        type="number"
        min={0}
        max={9999}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(9999, Number(e.target.value) || 0)))}
        className="input"
      />
    </div>
  );
}
