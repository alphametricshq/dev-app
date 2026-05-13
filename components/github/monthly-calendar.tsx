"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GithubContribDay } from "@/lib/db/queries";

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
const LEVEL_BG = [
  "bg-github-0",
  "bg-github-1",
  "bg-github-2",
  "bg-github-3",
  "bg-github-4",
];

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function GithubMonthlyCalendar({ days }: { days: GithubContribDay[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const map = new Map(days.map((d) => [d.date, d]));

  function prevMonth() {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else setMonth(month + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  }

  // Constrói grid
  const firstOfMonth = new Date(year, month - 1, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  type Cell = { iso: string | null; day: number | null; data: GithubContribDay | null; isToday: boolean };
  const cells: Cell[] = [];
  for (let i = 0; i < startOffset; i++) cells.push({ iso: null, day: null, data: null, isToday: false });
  let monthTotal = 0;
  let monthBest = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const iso = isoLocal(d);
    const data = map.get(iso) ?? null;
    const isToday = iso === isoLocal(today);
    if (data) {
      monthTotal += data.count;
      if (data.count > monthBest) monthBest = data.count;
    }
    cells.push({ iso, day, data, isToday });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null, data: null, isToday: false });

  const activeDaysInMonth = cells.filter((c) => c.data && c.data.count > 0).length;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-success" />
          <h3 className="text-sm font-semibold text-fg">Calendário mensal</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-lg border border-border bg-bg-subtle p-1.5 hover:bg-bg-hover"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-[150px] text-center text-sm font-semibold text-fg">
            {MONTHS_PT[month - 1]} {year}
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="rounded-lg border border-border bg-bg-subtle p-1.5 hover:bg-bg-hover disabled:opacity-30"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent hover:bg-accent/20"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-fg-muted">
        <span>
          Total: <span className="font-mono text-fg">{monthTotal}</span>
        </span>
        <span>
          Dias ativos: <span className="font-mono text-fg">{activeDaysInMonth}</span>
        </span>
        <span>
          Pico: <span className="font-mono text-fg">{monthBest}</span>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-[10px] uppercase tracking-wider text-fg-subtle">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (!cell.iso) return <div key={i} className="aspect-square" />;
          const level = cell.data?.level ?? 0;
          const count = cell.data?.count ?? 0;
          return (
            <div
              key={i}
              className={cn(
                "relative flex aspect-square flex-col items-start justify-between rounded-lg border p-1.5",
                cell.isToday ? "border-accent/60 ring-1 ring-accent/40" : "border-border/40",
                LEVEL_BG[level],
              )}
              title={`${cell.iso} — ${count} contribuição${count === 1 ? "" : "ões"}`}
            >
              <div
                className={cn(
                  "font-mono text-[11px]",
                  cell.isToday ? "font-bold text-accent" : level >= 3 ? "text-white" : "text-fg",
                )}
              >
                {cell.day}
              </div>
              {count > 0 && (
                <div
                  className={cn(
                    "self-end text-[10px] font-mono",
                    level >= 3 ? "text-white/80" : "text-fg-muted",
                  )}
                >
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-muted">
        <span>Menos</span>
        {LEVEL_BG.map((c, i) => (
          <div key={i} className={cn("h-3 w-3 rounded-[3px]", c)} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}
