"use client";

import { CheckCircle2, AlertTriangle, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitWithStats } from "@/lib/db/habits-queries";

const COLOR_BAR: Record<string, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  blue: "bg-[hsl(200_80%_60%)]",
  pink: "bg-[hsl(320_70%_65%)]",
};

type Status = "completed" | "at-risk" | "on-track";

function daysLeftInWeek(): number {
  // Semana = seg→dom. Hoje conta.
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // seg=0
  return 7 - dayOfWeek;
}

function computeStatus(habit: HabitWithStats, daysLeft: number): Status {
  const need = habit.target_per_week - habit.thisWeekCount;
  if (need <= 0) return "completed";
  if (need > daysLeft) return "at-risk";
  return "on-track";
}

function statusOrder(s: Status): number {
  return s === "at-risk" ? 0 : s === "on-track" ? 1 : 2;
}

export function HabitsWeeklyGoals({ habits }: { habits: HabitWithStats[] }) {
  if (habits.length === 0) return null;
  const daysLeft = daysLeftInWeek();

  const enriched = habits.map((h) => ({
    h,
    status: computeStatus(h, daysLeft),
    pct: Math.min(100, (h.thisWeekCount / h.target_per_week) * 100),
    need: Math.max(0, h.target_per_week - h.thisWeekCount),
  }));

  enriched.sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  const completedCount = enriched.filter((e) => e.status === "completed").length;
  const atRiskCount = enriched.filter((e) => e.status === "at-risk").length;

  return (
    <div className="card">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-fg">Meta semanal</h2>
          <span className="text-[11px] text-fg-subtle">
            {daysLeft} dia{daysLeft === 1 ? "" : "s"} restantes
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-fg-muted">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-success" />
            {completedCount}/{habits.length} batida{completedCount === 1 ? "" : "s"}
          </span>
          {atRiskCount > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3 w-3" />
              {atRiskCount} em risco
            </span>
          )}
        </div>
      </header>

      <div className="space-y-2">
        {enriched.map(({ h, status, pct, need }) => {
          const bar = COLOR_BAR[h.color] ?? COLOR_BAR.accent;
          return (
            <div
              key={h.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-bg-subtle px-3 py-2",
                status === "at-risk" && "border-warning/40",
                status === "completed" && "border-success/30",
                status === "on-track" && "border-border/50",
              )}
            >
              <span className="text-base">{h.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg" title={h.name}>
                {h.name}
              </span>
              <div className="flex w-32 flex-col items-end gap-1">
                <div className="flex w-full items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bg-hover">
                    <div className={cn("h-full transition-all", bar)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-fg">
                    {h.thisWeekCount}/{h.target_per_week}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-[10px]",
                    status === "completed" && "text-success",
                    status === "at-risk" && "text-warning",
                    status === "on-track" && "text-fg-subtle",
                  )}
                >
                  {status === "completed" ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      batida
                    </span>
                  ) : status === "at-risk" ? (
                    `falta ${need} em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`
                  ) : (
                    `faltam ${need}`
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
