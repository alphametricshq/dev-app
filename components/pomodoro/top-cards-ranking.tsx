import { KanbanSquare, Trophy } from "lucide-react";
import type { TopCard } from "@/lib/db/pomodoro-queries";

export function TopCardsRanking({ cards }: { cards: TopCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="card">
        <header className="mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Cards mais focados</h3>
        </header>
        <p className="py-4 text-center text-xs text-fg-subtle">
          Vincule cards aos pomodoros (botão &ldquo;Vincular card&rdquo; no timer) pra
          aparecer aqui.
        </p>
      </div>
    );
  }

  const maxMin = Math.max(...cards.map((c) => c.focus_min));

  return (
    <div className="card">
      <header className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">Cards mais focados</h3>
        <span className="text-[10px] text-fg-subtle">90 dias</span>
      </header>
      <ul className="space-y-2">
        {cards.map((c, i) => {
          const pct = (c.focus_min / maxMin) * 100;
          return (
            <li key={c.card_id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                  {i + 1}
                </span>
                <KanbanSquare className="h-3 w-3 shrink-0 text-fg-subtle" />
                <span className="min-w-0 flex-1 truncate text-fg" title={c.card_name}>
                  {c.card_name}
                </span>
                <span className="font-mono text-[11px] text-fg-muted">
                  {formatMin(c.focus_min)}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-bg-subtle">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-fg-subtle">
                {c.sessions} sessão{c.sessions === 1 ? "" : "es"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatMin(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}
