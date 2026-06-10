"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { habitColorCss } from "@/lib/habit-colors";

type Habit = { id: number; name: string; emoji: string; color: string };
type CalendarData = {
  habits: Habit[];
  logs: Record<string, number[]>;
  year: number;
  month: number;
};

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HabitsCalendarView() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/habits/calendar?month=${year}-${String(month).padStart(2, "0")}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        if (d?.ok) setData({ habits: d.habits, logs: d.logs, year: d.year, month: d.month });
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [year, month]);

  function prevMonth() {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }
  function nextMonth() {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  }

  // Constrói grid 7 colunas começando no domingo
  const firstOfMonth = new Date(year, month - 1, 1);
  const startOffset = firstOfMonth.getDay(); // 0=domingo
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: { iso: string | null; day: number | null; isToday: boolean }[] = [];
  for (let i = 0; i < startOffset; i++) cells.push({ iso: null, day: null, isToday: false });
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const iso = isoLocal(d);
    const isToday = iso === isoLocal(today);
    cells.push({ iso, day, isToday });
  }
  // Completa até múltiplo de 7
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null, isToday: false });

  const habitColor = (habitId: number) => {
    const h = data?.habits.find((x) => x.id === habitId);
    if (!h) return "#6b7280";
    return habitColorCss(h.color);
  };
  const habitInfo = (habitId: number) => data?.habits.find((x) => x.id === habitId);

  const totalDone = data ? Object.values(data.logs).reduce((s, ids) => s + ids.length, 0) : 0;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-lg border border-border bg-bg-subtle p-1.5 hover:bg-bg-hover"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-[180px] text-center text-sm font-semibold text-fg">
            {MONTHS_PT[month - 1]} {year}
          </div>
          <button
            onClick={nextMonth}
            className="rounded-lg border border-border bg-bg-subtle p-1.5 hover:bg-bg-hover"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="ml-2 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent hover:bg-accent/20"
            >
              Hoje
            </button>
          )}
        </div>
        <div className="text-[11px] text-fg-muted">
          {data && data.habits.length > 0 && (
            <span>
              {totalDone} marcações · {data.habits.length} hábito{data.habits.length === 1 ? "" : "s"} ativos
            </span>
          )}
        </div>
      </div>

      {/* Legenda */}
      {data && data.habits.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {data.habits.map((h) => (
            <div key={h.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: habitColorCss(h.color) }}
              />
              <span className="text-fg-muted">
                {h.emoji} {h.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-fg-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando...
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-card p-3">
          {/* Cabeçalho dias da semana */}
          <div className="mb-2 grid grid-cols-7 gap-1.5 text-[10px] uppercase tracking-wider text-fg-subtle">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell, i) => {
              if (!cell.iso) return <div key={i} className="aspect-square" />;
              const habitIds = data?.logs[cell.iso] ?? [];
              return (
                <div
                  key={i}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-between rounded-lg border bg-bg-subtle p-1 text-[11px] transition-colors",
                    cell.isToday
                      ? "border-accent/60 ring-1 ring-accent/40"
                      : "border-border/40 hover:border-border-strong",
                  )}
                  title={
                    habitIds.length > 0
                      ? habitIds
                          .map((id) => `${habitInfo(id)?.emoji ?? "•"} ${habitInfo(id)?.name ?? ""}`)
                          .join("\n")
                      : `${cell.iso} (nada marcado)`
                  }
                >
                  <div
                    className={cn(
                      "font-mono",
                      cell.isToday ? "font-bold text-accent" : "text-fg",
                    )}
                  >
                    {cell.day}
                  </div>
                  <div className="flex flex-wrap items-end justify-center gap-0.5">
                    {habitIds.slice(0, 6).map((id, idx) => (
                      <span
                        key={`${id}-${idx}`}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: habitColor(id) }}
                      />
                    ))}
                    {habitIds.length > 6 && (
                      <span className="text-[9px] text-fg-subtle">+{habitIds.length - 6}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
