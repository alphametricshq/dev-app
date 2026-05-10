import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEvent, ActivityType } from "@/lib/activity-feed";

const TYPE_COLORS: Record<ActivityType, string> = {
  pomodoro: "bg-warning/15 text-warning",
  habit: "bg-accent/15 text-accent",
  journal: "bg-success/15 text-success",
  trello: "bg-warning/15 text-warning",
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="card">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Atividade de hoje</h3>
        </div>
        <span className="text-[11px] text-fg-muted">
          {events.length === 0
            ? "nada ainda"
            : `${events.length} evento${events.length === 1 ? "" : "s"}`}
        </span>
      </header>

      {events.length === 0 ? (
        <div className="py-8 text-center text-sm text-fg-muted">
          Sem atividade hoje. Bora começar?
        </div>
      ) : (
        <ol className="relative space-y-2 border-l border-border/60 pl-5 ml-2">
          {events.map((e) => (
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
      )}
    </div>
  );
}

function formatTime(ts: string): string {
  // ts vem em formato local "YYYY-MM-DD HH:MM:SS" do SQLite (sempre UTC)
  const d = new Date(ts.replace(" ", "T") + "Z");
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
