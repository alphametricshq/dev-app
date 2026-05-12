"use client";

import { useEffect, useState } from "react";
import { Bookmark, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { Template } from "@/lib/db/templates-queries";

export function TemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data?.ok) setTemplates(data.templates ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(t: Template) {
    if (!confirm(`Apagar template "${t.name}"?`)) return;
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    try {
      const res = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      toast.success("Template apagado");
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
      refresh();
    }
  }

  const cardTemplates = templates.filter((t) => t.type === "card");
  const habitTemplates = templates.filter((t) => t.type === "habit");

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Bookmark className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Templates</h2>
          <p className="text-xs text-fg-muted">
            Gerencie templates salvos de cards e hábitos
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando...
        </div>
      ) : templates.length === 0 ? (
        <p className="py-3 text-center text-xs text-fg-subtle">
          Nenhum template salvo ainda. Crie um pelo modal de card ou no formulário de hábito.
        </p>
      ) : (
        <div className="space-y-4">
          <Group
            title="Cards"
            templates={cardTemplates}
            onDelete={handleDelete}
            emptyMsg="Nenhum template de card"
          />
          <Group
            title="Hábitos"
            templates={habitTemplates}
            onDelete={handleDelete}
            emptyMsg="Nenhum template de hábito"
          />
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  templates,
  onDelete,
  emptyMsg,
}: {
  title: string;
  templates: Template[];
  onDelete: (t: Template) => void;
  emptyMsg: string;
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
        {title} {templates.length > 0 && `(${templates.length})`}
      </h3>
      {templates.length === 0 ? (
        <p className="text-[11px] text-fg-subtle">{emptyMsg}</p>
      ) : (
        <ul className="space-y-1">
          {templates.map((t) => (
            <li
              key={t.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2 text-sm",
              )}
            >
              <Bookmark className="h-3.5 w-3.5 text-accent" />
              <span className="flex-1 truncate text-fg">{t.name}</span>
              <button
                onClick={() => onDelete(t)}
                className="rounded p-1 text-fg-subtle hover:bg-danger/15 hover:text-danger"
                aria-label="Apagar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
