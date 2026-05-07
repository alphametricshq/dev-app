import type { TrelloTaskRow } from "@/lib/db/queries";
import { ExternalLink } from "lucide-react";

export function RecentTasks({ tasks }: { tasks: TrelloTaskRow[] }) {
  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-fg">Últimas concluídas</h3>
        <p className="text-xs text-fg-muted">{tasks.length} tarefas mais recentes</p>
      </div>
      {tasks.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-fg-muted">
          Sem dados ainda
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="group flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-fg">{t.card_name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-muted">
                  <span className="rounded-full bg-bg-hover px-2 py-0.5">
                    {t.board_name ?? "—"}
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(t.completed_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              {t.url && (
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-fg-muted" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
