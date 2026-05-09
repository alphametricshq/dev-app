import { Brain, Coffee } from "lucide-react";
import type { PomodoroSession } from "@/lib/db/pomodoro-queries";
import { cn } from "@/lib/utils";

const TYPE_META = {
  focus: { label: "Foco", icon: Brain, color: "text-accent bg-accent/15" },
  short_break: { label: "Pausa curta", icon: Coffee, color: "text-success bg-success/15" },
  long_break: { label: "Pausa longa", icon: Coffee, color: "text-warning bg-warning/15" },
} as const;

export function SessionsHistory({ sessions }: { sessions: PomodoroSession[] }) {
  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-fg">Últimas sessões</h3>
      {sessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-muted">Nenhuma sessão ainda</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const meta = TYPE_META[s.type];
            const Icon = meta.icon;
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2 text-sm"
              >
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", meta.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-fg">
                    {meta.label} ·{" "}
                    <span className="font-mono text-xs text-fg-muted">
                      {s.duration_min}min
                    </span>
                  </div>
                  {s.card_name && (
                    <div className="truncate text-[11px] text-fg-subtle">{s.card_name}</div>
                  )}
                </div>
                <span className="font-mono text-[11px] text-fg-subtle">
                  {new Date(s.finished_at + "Z").toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
