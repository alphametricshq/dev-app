"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Flame, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type Habit = { id: number; name: string; emoji: string; color: string };
type YearlyData = {
  habits: Habit[];
  logs: Record<string, number[]>;
};

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function intensityClass(count: number, maxConcurrent: number): string {
  if (count === 0) return "bg-bg-hover/40";
  const ratio = maxConcurrent > 0 ? count / maxConcurrent : 0;
  if (ratio < 0.25) return "bg-accent/25";
  if (ratio < 0.5) return "bg-accent/50";
  if (ratio < 0.75) return "bg-accent/70";
  return "bg-accent";
}

function computeStreak(logs: Record<string, number[]>): { current: number; longest: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoLocal(today);
  const hasToday = (logs[todayIso] ?? []).length > 0;
  const startOff = hasToday ? 0 : 1;
  let current = 0;
  for (let i = startOff; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if ((logs[isoLocal(d)] ?? []).length > 0) current++;
    else break;
  }
  let longest = 0;
  let run = 0;
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if ((logs[isoLocal(d)] ?? []).length > 0) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  return { current, longest };
}

export function HabitsYearlyView() {
  const [data, setData] = useState<YearlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterHabit, setFilterHabit] = useState<number | "all">("all");

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const param = filterHabit === "all" ? "all" : String(filterHabit);
    fetch(`/api/habits/yearly?habit=${param}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        if (d?.ok) setData({ habits: d.habits, logs: d.logs });
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [filterHabit]);

  const stats = useMemo(() => {
    if (!data) return null;
    let totalMarcacoes = 0;
    let activeDays = 0;
    let bestDay: { date: string; count: number } | null = null;
    let maxConcurrent = 0;
    for (const [date, ids] of Object.entries(data.logs)) {
      totalMarcacoes += ids.length;
      if (ids.length > 0) activeDays++;
      if (ids.length > maxConcurrent) maxConcurrent = ids.length;
      if (!bestDay || ids.length > bestDay.count) bestDay = { date, count: ids.length };
    }
    const { current, longest } = computeStreak(data.logs);
    return { totalMarcacoes, activeDays, bestDay, maxConcurrent, current, longest };
  }, [data]);

  // Constrói grid 53 semanas
  const grid = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 52 * 7 - today.getDay());

    const weeks: Array<Array<{ iso: string; count: number; future: boolean } | null>> = [];
    const monthLabels: Array<{ weekIdx: number; label: string }> = [];
    let lastMonth = -1;
    const cursor = new Date(start);

    for (let w = 0; w < 53; w++) {
      const week: Array<{ iso: string; count: number; future: boolean } | null> = [];
      for (let d = 0; d < 7; d++) {
        const iso = isoLocal(cursor);
        const future = cursor > today;
        const count = (data?.logs[iso] ?? []).length;
        week.push({ iso, count, future });
        cursor.setDate(cursor.getDate() + 1);
      }
      const first = week.find((c) => c && !c.future);
      if (first) {
        const m = new Date(first.iso + "T00:00:00").getMonth();
        if (m !== lastMonth) {
          monthLabels.push({ weekIdx: w, label: MONTHS_PT[m] });
          lastMonth = m;
        }
      }
      weeks.push(week);
    }
    return { weeks, monthLabels };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Filtro de hábito */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilterHabit("all")}
          className={cn(
            "rounded-full border px-3 py-0.5 text-xs transition-colors",
            filterHabit === "all"
              ? "border-accent bg-accent/15 text-accent"
              : "border-border text-fg-muted hover:bg-bg-hover hover:text-fg",
          )}
        >
          Todos
        </button>
        {data?.habits.map((h) => (
          <button
            key={h.id}
            onClick={() => setFilterHabit(h.id)}
            className={cn(
              "rounded-full border px-3 py-0.5 text-xs transition-colors",
              filterHabit === h.id
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-fg-muted hover:bg-bg-hover hover:text-fg",
            )}
          >
            {h.emoji} {h.name}
          </button>
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Marcações" value={stats.totalMarcacoes} hint="no ano" icon={<Calendar className="h-3.5 w-3.5" />} />
          <StatBlock label="Dias ativos" value={stats.activeDays} hint="/ 365" icon={<Flame className="h-3.5 w-3.5 text-warning" />} />
          <StatBlock label="Streak atual" value={stats.current} hint="dias" icon={<Flame className="h-3.5 w-3.5 text-warning" />} />
          <StatBlock label="Recorde" value={stats.longest} hint="dias seguidos" icon={<Trophy className="h-3.5 w-3.5 text-warning" />} />
        </div>
      )}

      {/* Heatmap */}
      <div className="card">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-fg-muted">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-flex">
              <div className="flex flex-col justify-around pr-2 pt-5 text-[10px] text-fg-subtle">
                <span>{DAY_LABELS[1]}</span>
                <span>{DAY_LABELS[3]}</span>
                <span>{DAY_LABELS[5]}</span>
              </div>
              <div>
                <div className="relative h-4 text-[10px] text-fg-subtle">
                  {grid.monthLabels.map((m, i) => (
                    <span key={i} className="absolute" style={{ left: `${m.weekIdx * 14}px` }}>
                      {m.label}
                    </span>
                  ))}
                </div>
                <div className="flex" style={{ gap: "3px" }}>
                  {grid.weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col" style={{ gap: "3px" }}>
                      {week.map((cell, di) => {
                        if (!cell) return <div key={di} style={{ width: 11, height: 11 }} />;
                        if (cell.future) return <div key={di} style={{ width: 11, height: 11 }} />;
                        return (
                          <div
                            key={di}
                            title={`${cell.iso} — ${cell.count} marcaç${cell.count === 1 ? "ão" : "ões"}`}
                            className={cn(
                              "rounded-[2px] transition-all hover:ring-1 ring-fg/30 cursor-pointer",
                              intensityClass(cell.count, stats?.maxConcurrent ?? 1),
                            )}
                            style={{ width: 11, height: 11 }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-fg-muted">
                  <span>Menos</span>
                  {[0, 0.2, 0.4, 0.7, 1].map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-[2px]",
                        i === 0 ? "bg-bg-hover/40" : intensityClass(Math.ceil(r * (stats?.maxConcurrent ?? 1)), stats?.maxConcurrent ?? 1),
                      )}
                      style={{ width: 11, height: 11 }}
                    />
                  ))}
                  <span>Mais</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBlock({ label, value, hint, icon }: { label: string; value: number; hint: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/50 bg-bg-subtle px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-muted">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-xl font-semibold text-fg">{value}</div>
      <div className="text-[11px] text-fg-subtle">{hint}</div>
    </div>
  );
}
