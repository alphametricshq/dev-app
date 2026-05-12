import { Sparkles } from "lucide-react";
import { computePatterns, type Pattern } from "@/lib/insights/patterns";

export async function PatternsCard() {
  let patterns: Pattern[] = [];
  try {
    patterns = await computePatterns();
  } catch {
    // ignore
  }

  if (patterns.length === 0) {
    return (
      <div className="card">
        <header className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-fg">Padrões</h2>
        </header>
        <p className="text-xs text-fg-subtle">
          Continue usando o app — em breve você vai descobrir padrões da sua produtividade aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="text-base font-semibold text-fg">Padrões</h2>
        <span className="text-[11px] text-fg-subtle">últimos 90 dias</span>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {patterns.map((p) => (
          <div
            key={p.id}
            className="flex items-start gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xl">
              {p.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-fg-muted">{p.title}</div>
              <div className="truncate text-sm font-semibold text-fg">{p.value}</div>
              <div className="text-[11px] text-fg-subtle">{p.hint}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
