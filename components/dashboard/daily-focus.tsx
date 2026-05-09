"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Sunset, Moon, Star, Clock, ExternalLink, GitCommit, CheckSquare, KanbanSquare } from "lucide-react";
import type { GoalProgress } from "@/lib/gamification/goals";
import type { PinnedCard } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export function DailyFocus({
  dailyGoal,
  pinnedCards,
}: {
  dailyGoal: GoalProgress;
  pinnedCards: PinnedCard[];
}) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const greeting = getGreeting(now);
  const Icon = getGreetingIcon(now);
  const remaining = remainingHours(now);

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fg">{greeting}</h2>
              <p className="text-xs text-fg-muted">
                {dailyGoal.completed
                  ? "Meta de hoje batida! 🎯 Bora além."
                  : "Foque no que importa pra fechar o dia"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-bg-subtle px-3 py-1 text-[11px] text-fg-muted">
            <Clock className="h-3 w-3" />
            <span>{remaining} até virar o dia</span>
          </div>
        </header>

        {/* Barras de meta diária — destaque grande */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BigGoalBar
            label="GitHub"
            icon={GitCommit}
            current={dailyGoal.github.current}
            target={dailyGoal.github.target}
            pct={dailyGoal.github.pct}
            color="success"
          />
          <BigGoalBar
            label="Trello"
            icon={CheckSquare}
            current={dailyGoal.trello.current}
            target={dailyGoal.trello.target}
            pct={dailyGoal.trello.pct}
            color="warning"
          />
        </div>

        {/* Top prioridades */}
        <div className="mt-6 space-y-2.5">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <h3 className="text-sm font-semibold text-fg">Prioridades fixadas</h3>
              <span className="text-[11px] text-fg-subtle">
                {pinnedCards.length === 0 ? "(nenhuma)" : `${pinnedCards.length}`}
              </span>
            </div>
            <Link href="/board" className="flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg">
              <KanbanSquare className="h-3 w-3" />
              Abrir board
            </Link>
          </header>

          {pinnedCards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
              <Star className="mx-auto mb-2 h-5 w-5 text-fg-subtle" />
              <p>
                Vá no <Link href="/board" className="text-accent hover:underline">Board</Link> e
                clique no ícone de estrela em até 3 cards pra fixá-los aqui como foco do dia.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {pinnedCards.slice(0, 3).map((c, i) => (
                <li
                  key={c.card_id}
                  className="group flex items-center gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2.5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/15 text-xs font-semibold text-warning">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-fg">{c.card_name ?? "(sem título)"}</div>
                    {c.list_name && (
                      <div className="text-[11px] text-fg-subtle">em {c.list_name}</div>
                    )}
                  </div>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-fg-subtle hover:text-fg" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function BigGoalBar({
  label,
  icon: Icon,
  current,
  target,
  pct,
  color,
}: {
  label: string;
  icon: typeof GitCommit;
  current: number;
  target: number;
  pct: number;
  color: "success" | "warning";
}) {
  const done = current >= target;
  const remaining = Math.max(0, target - current);
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        done ? "border-success/40 bg-success/5" : "border-border bg-bg-subtle",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <span className="font-mono text-xs text-fg">
          {current} / {target}
        </span>
      </div>
      <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-bg-hover">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            color === "success" ? "bg-success" : "bg-warning",
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="text-[11px] text-fg-subtle">
        {done
          ? "✓ meta batida"
          : remaining === 1
            ? "falta 1"
            : `faltam ${remaining}`}
      </div>
    </div>
  );
}

function getGreeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Madrugada produtiva";
  if (h < 12) return "Bom dia!";
  if (h < 18) return "Boa tarde!";
  return "Boa noite!";
}

function getGreetingIcon(d: Date): typeof Sun {
  const h = d.getHours();
  if (h < 12) return Sun;
  if (h < 18) return Sunset;
  return Moon;
}

function remainingHours(now: Date): string {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diffMs = end.getTime() - now.getTime();
  const totalMin = Math.max(0, Math.floor(diffMs / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
