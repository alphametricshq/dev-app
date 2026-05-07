import type { SyncLogEntry } from "@/lib/db/queries";
import { Github, Trello, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Github> = {
  github: Github,
  trello: Trello,
};

export function SyncStatus({ syncs }: { syncs: SyncLogEntry[] }) {
  const sources = ["github", "trello"];
  const byName = new Map(syncs.map((s) => [s.source, s]));

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-fg">Status das integrações</h3>
        <p className="text-xs text-fg-muted">Última sincronização por fonte</p>
      </div>
      <ul className="space-y-2">
        {sources.map((src) => {
          const s = byName.get(src);
          const Icon = ICONS[src] ?? Clock;
          const ok = s?.status === "success";
          const err = s?.status === "error";
          return (
            <li
              key={src}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-fg-muted" />
                <div>
                  <div className="text-sm capitalize text-fg">{src}</div>
                  <div className="text-[11px] text-fg-muted">
                    {s
                      ? s.finished_at
                        ? new Date(s.finished_at).toLocaleString("pt-BR")
                        : "em andamento..."
                      : "nunca sincronizado"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {s && (
                  <span className="text-fg-muted">{s.items_synced} itens</span>
                )}
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    ok && "bg-success/20 text-success",
                    err && "bg-danger/20 text-danger",
                    !s && "bg-bg-hover text-fg-subtle"
                  )}
                >
                  {ok && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {err && <XCircle className="h-3.5 w-3.5" />}
                  {!s && <Clock className="h-3.5 w-3.5" />}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {syncs.find((s) => s.status === "error" && s.message) && (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {syncs.find((s) => s.status === "error" && s.message)?.message}
        </div>
      )}
    </div>
  );
}
