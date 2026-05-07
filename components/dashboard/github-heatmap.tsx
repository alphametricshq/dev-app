"use client";

import { useMemo, useState, useRef } from "react";
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

type HoverState = { day: GithubContribDay; x: number; y: number } | null;

export function GithubHeatmap({ days }: { days: GithubContribDay[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState>(null);

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

  function handleEnter(e: React.MouseEvent<HTMLDivElement>, day: GithubContribDay) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = e.currentTarget.getBoundingClientRect();
    setHover({
      day,
      x: target.left - rect.left + target.width / 2,
      y: target.top - rect.top,
    });
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-fg">Contribuições GitHub</h3>
          <p className="text-xs text-fg-muted">{total.toLocaleString("pt-BR")} no último ano</p>
        </div>
        <Legend />
      </div>

      <div ref={containerRef} className="relative overflow-x-auto">
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
            <div className="flex gap-[3px]" onMouseLeave={() => setHover(null)}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      onMouseEnter={day ? (e) => handleEnter(e, day) : undefined}
                      className={`h-[11px] w-[11px] rounded-[2px] ring-fg/30 transition-all ${
                        day ? `${LEVEL_COLORS[day.level]} cursor-pointer hover:ring-1` : "bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: hover.x, top: hover.y - 6 }}
          >
            <div className="whitespace-nowrap rounded-lg border border-border-strong bg-bg-card px-3 py-2 text-xs shadow-xl">
              <div className="font-semibold text-fg">
                {hover.day.count === 0
                  ? "Nenhuma contribuição"
                  : `${hover.day.count} contribuição${hover.day.count > 1 ? "ões" : ""}`}
              </div>
              <div className="mt-0.5 text-fg-muted">{formatLongDate(hover.day.date)}</div>
              <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-px h-2 w-2 rotate-45 border-b border-r border-border-strong bg-bg-card" />
            </div>
          </div>
        )}
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

function formatLongDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
