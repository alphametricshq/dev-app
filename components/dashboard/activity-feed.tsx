import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEvent, ActivityType } from "@/lib/activity-feed";

const TYPE_COLORS: Record<ActivityType, string> = {
  pomodoro: "bg-warning/15 text-warning",
  habit: "bg-accent/15 text-accent",
  journal: "bg-success/15 text-success",
};

function parseDate(ts: string): Date {
  return new Date(ts.replace(" ", "T") + (ts.endsWith("Z") ? "" : "Z"));
}

function isoDateKey(d: Date): string {
  // Usa data LOCAL (não UTC) pra agrupamento bater com a percepção do user
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yIso = isoDateKey(yesterday);

  if (iso === todayIso) return "Hoje";
  if (iso === yIso) return "Ontem";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function formatTime(ts: string): string {
  return parseDate(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  // Agrupa por data LOCAL
  const groups: Record<string, ActivityEvent[]> = {};
  for (const e of events) {
    const localDate = parseDate(e.timestamp);
    const key = isoDateKey(localDate);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="card">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Atividade recente</h3>
        </div>
        <span className="text-[11px] text-fg-muted">
          {events.length === 0
            ? "sem atividade"
            : `${events.length} evento${events.length === 1 ? "" : "s"} · 7 dias`}
        </span>
      </header>

      {events.length === 0 ? (
        <div className="py-8 text-center text-sm text-fg-muted">
          Sem atividade nos últimos 7 dias.
        </div>
      ) : (
        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
          {sortedKeys.map((dateKey) => (
            <section key={dateKey}>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                {formatDateLabel(dateKey)}
              </div>
              <ol className="relative space-y-2 border-l border-border/60 pl-5 ml-2">
                {groups[dateKey].map((e) => (
                  <li key={e.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-bg-card text-xs",
                        TYPE_COLORS[e.type],
                      )}
                    >
                      {e.emoji}
                    </span>
                    <div className="rounded-lg border border-border/40 bg-bg-subtle px-3 py-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm text-fg">{e.title}</span>
                        <time className="shrink-0 font-mono text-[10px] text-fg-subtle">
                          {formatTime(e.timestamp)}
                        </time>
                      </div>
                      {e.description && (
                        <div className="mt-0.5 truncate text-[11px] text-fg-muted">
                          {e.description}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
