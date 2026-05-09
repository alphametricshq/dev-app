"use client";

import { useState } from "react";
import { Check, Pencil, Archive, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitWithStats } from "@/lib/db/habits-queries";

const COLOR_CLASSES: Record<string, { bg: string; ring: string; cell: string; text: string }> = {
  accent: { bg: "bg-accent", ring: "ring-accent/40", cell: "bg-accent", text: "text-accent" },
  success: { bg: "bg-success", ring: "ring-success/40", cell: "bg-success", text: "text-success" },
  warning: { bg: "bg-warning", ring: "ring-warning/40", cell: "bg-warning", text: "text-warning" },
  danger: { bg: "bg-danger", ring: "ring-danger/40", cell: "bg-danger", text: "text-danger" },
  blue: { bg: "bg-[hsl(200_80%_60%)]", ring: "ring-[hsl(200_80%_60%/0.4)]", cell: "bg-[hsl(200_80%_60%)]", text: "text-[hsl(200_80%_60%)]" },
  pink: { bg: "bg-[hsl(320_70%_65%)]", ring: "ring-[hsl(320_70%_65%/0.4)]", cell: "bg-[hsl(320_70%_65%)]", text: "text-[hsl(320_70%_65%)]" },
};

export function HabitCard({
  habit,
  onToggleToday,
  onEdit,
  onArchive,
}: {
  habit: HabitWithStats;
  onToggleToday: (habit: HabitWithStats) => void;
  onEdit: (habit: HabitWithStats) => void;
  onArchive: (habit: HabitWithStats) => void;
}) {
  const colors = COLOR_CLASSES[habit.color] ?? COLOR_CLASSES.accent;
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const done = optimisticDone ?? habit.doneToday;

  return (
    <div
      className={cn(
        "card relative flex flex-col gap-3 transition-colors",
        done && `ring-1 ${colors.ring}`,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-2xl">
            {habit.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-fg">{habit.name}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-muted">
              <span>
                Meta: {habit.target_per_week}/sem
              </span>
              <span>·</span>
              <span>
                Esta semana: {habit.thisWeekCount}/{habit.target_per_week}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => onEdit(habit)}
            className="rounded p-1 text-fg-subtle hover:bg-bg-hover hover:text-fg"
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Arquivar "${habit.name}"?`)) onArchive(habit);
            }}
            className="rounded p-1 text-fg-subtle hover:bg-danger/20 hover:text-danger"
            aria-label="Arquivar"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="Streak" value={habit.currentStreak} icon={<Flame className="h-3 w-3 text-warning" />} />
        <Stat label="Recorde" value={habit.longestStreak} />
        <Stat label="30 dias" value={`${habit.consistencyPct.toFixed(0)}%`} />
      </div>

      <MiniHeatmap colorClass={colors.cell} doneSet={new Set(habit.last30DaysLogs)} />

      <button
        onClick={() => {
          setOptimisticDone(!done);
          onToggleToday(habit);
        }}
        className={cn(
          "mt-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          done
            ? `${colors.bg} text-white hover:opacity-90`
            : "border border-border bg-bg-subtle text-fg-muted hover:bg-bg-hover hover:text-fg",
        )}
      >
        <Check className={cn("h-4 w-4", done ? "opacity-100" : "opacity-50")} />
        {done ? "Feito hoje" : "Marcar como feito"}
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-bg-subtle px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-fg">
        {icon}
        <span className="text-base font-semibold">{value}</span>
      </div>
      <div className="text-[10px] text-fg-subtle">{label}</div>
    </div>
  );
}

function MiniHeatmap({ doneSet, colorClass }: { doneSet: Set<string>; colorClass: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { iso: string; done: boolean }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, done: doneSet.has(iso) });
  }
  return (
    <div className="flex gap-[3px]">
      {days.map((d) => (
        <div
          key={d.iso}
          title={d.iso}
          className={cn(
            "h-2 flex-1 rounded-[2px]",
            d.done ? colorClass : "bg-bg-hover",
          )}
        />
      ))}
    </div>
  );
}
