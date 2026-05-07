"use client";

import { useMemo } from "react";
import type { GithubContribDay } from "@/lib/db/queries";

const LEVEL_COLORS = [
  "bg-github-0",
  "bg-github-1",
  "bg-github-2",
  "bg-github-3",
  "bg-github-4",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function GithubHeatmap({ days }: { days: GithubContribDay[] }) {
  const { weeks, monthLabels, total } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(today.getDate() - 52 * 7 - today.getDay());

    const weeks: (GithubContribDay | null)[][] = [];
    const monthLabels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    let total = 0;

    const cursor = new Date(start);
    for (let w = 0; w < 53; w++) {
      const week: (GithubContribDay | null)[] = [];
      for (let d = 0; d < 7; d++) {
        if (cursor > today) {
          week.push(null);
        } else {
          const iso = cursor.toISOString().slice(0, 10);
          const day = byDate.get(iso) ?? { date: iso, count: 0, level: 0 };
          week.push(day);
          total += day.count;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      const firstOfWeek = week.find((d) => d) as GithubContribDay | undefined;
      if (firstOfWeek) {
        const m = new Date(firstOfWeek.date).getMonth();
        if (m !== lastMonth) {
          monthLabels.push({ weekIndex: w, label: MONTHS[m] });
          lastMonth = m;
        }
      }
      weeks.push(week);
    }

    return { weeks, monthLabels, total };
  }, [days]);

  return (
    <div className="card">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-fg">Contribuições GitHub</h3>
          <p className="text-xs text-fg-muted">{total.toLocaleString("pt-BR")} no último ano</p>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full">
          <div className="flex flex-col justify-around pr-2 pt-5 text-[10px] text-fg-subtle">
            <span>{WEEKDAYS[1]}</span>
            <span>{WEEKDAYS[3]}</span>
            <span>{WEEKDAYS[5]}</span>
          </div>
          <div className="flex-1">
            <div className="relative h-4 text-[10px] text-fg-subtle">
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  className="absolute"
                  style={{ left: `${(m.weekIndex / weeks.length) * 100}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      title={day ? `${day.date}: ${day.count} contribuições` : ""}
                      className={`h-[11px] w-[11px] rounded-[2px] ${
                        day ? LEVEL_COLORS[day.level] : "bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
      <span>Menos</span>
      {LEVEL_COLORS.map((c, i) => (
        <div key={i} className={`h-[11px] w-[11px] rounded-[2px] ${c}`} />
      ))}
      <span>Mais</span>
    </div>
  );
}
