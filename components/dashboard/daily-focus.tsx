"use client";

import { useEffect, useState } from "react";
import { Sun, Sunset, Moon, Clock, GitCommit } from "lucide-react";
import type { GoalProgress } from "@/lib/gamification/goals";
import { cn } from "@/lib/utils";

export function DailyFocus({ dailyGoal }: { dailyGoal: GoalProgress }) {
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

        <BigGoalBar
          label="GitHub"
          current={dailyGoal.github.current}
          target={dailyGoal.github.target}
          pct={dailyGoal.github.pct}
        />
      </div>
    </div>
  );
}

function BigGoalBar({
  label,
  current,
  target,
  pct,
}: {
  label: string;
  current: number;
  target: number;
  pct: number;
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
          <GitCommit className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <span className="font-mono text-xs text-fg">
          {current} / {target}
        </span>
      </div>
      <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-bg-hover">
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="text-[11px] text-fg-subtle">
        {done ? "✓ meta batida" : remaining === 1 ? "falta 1" : `faltam ${remaining}`}
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
