"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Flame, Loader2, Calendar, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit } from "@/lib/db/habits-queries";

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const COLOR_HEX: Record<string, string> = {
  accent: "var(--accent)",
  success: "hsl(155 60% 50%)",
  warning: "hsl(38 90% 55%)",
  danger: "hsl(0 70% 60%)",
  blue: "hsl(200 80% 60%)",
  pink: "hsl(320 70% 65%)",
};

type Streak = { length: number; from: string; to: string };

export function HabitHistoryModal({ habitId, onClose }: { habitId: number; onClose: () => void }) {
  const [habit, setHabit] = useState<Habit | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/habits/${habitId}/history?days=365`)
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        if (data?.ok) {
          setHabit(data.habit);
          setDates(data.dates);
        }
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [habitId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stats = useMemo(() => computeStats(dates), [dates]);
  const cellColor = habit ? COLOR_HEX[habit.color] ?? COLOR_HEX.accent : COLOR_HEX.accent;

  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-12 backdrop-blur-sm"
    >
      <div className="w-full max-w-4xl rounded-xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-subtle text-2xl">
              {habit?.emoji ?? "✨"}
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">{habit?.name ?? "Carregando..."}</h2>
              <p className="text-xs text-fg-muted">Histórico dos últimos 365 dias</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-fg-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando histórico...
          </div>
        ) : (
          <div className="space-y-6 px-6 py-5">
            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="Total feito" value={stats.totalDone} hint={`${stats.consistencyPct.toFixed(0)}% consistência`} icon={<Calendar className="h-3.5 w-3.5" />} />
              <SummaryCard label="Streak atual" value={stats.currentStreak} hint={stats.currentStreak > 0 ? "🔥 mantém" : "comece hoje"} icon={<Flame className="h-3.5 w-3.5 text-warning" />} />
              <SummaryCard label="Recorde" value={stats.longestStreak} hint="dias seguidos" icon={<Trophy className="h-3.5 w-3.5 text-warning" />} />
              <SummaryCard label="Melhor mês" value={`${stats.bestMonth.count}d`} hint={stats.bestMonth.label} icon={<TrendingUp className="h-3.5 w-3.5 text-success" />} />
            </div>

            {/* Heatmap GitHub-style */}
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-muted">Heatmap anual</h3>
              <YearlyHeatmap dates={new Set(dates)} cellColor={cellColor} />
            </div>

            {/* Top streaks */}
            {stats.topStreaks.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-muted">Maiores sequências</h3>
                <div className="space-y-1.5">
                  {stats.topStreaks.slice(0, 5).map((s, i) => (
                    <div
                      key={`${s.from}-${s.to}`}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2 text-xs"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/15 text-[11px] font-bold text-warning">
                        {i + 1}
                      </div>
                      <Flame className="h-3.5 w-3.5 text-warning" />
                      <span className="font-mono text-base font-semibold text-fg">{s.length}</span>
                      <span className="text-fg-muted">dias</span>
                      <span className="ml-auto font-mono text-[11px] text-fg-subtle">
                        {formatDate(s.from)} → {formatDate(s.to)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Por mês */}
            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-fg-muted">Por mês</h3>
              <MonthlyBars buckets={stats.monthly} cellColor={cellColor} />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SummaryCard({ label, value, hint, icon }: { label: string; value: string | number; hint: string; icon: React.ReactNode }) {
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

function YearlyHeatmap({ dates, cellColor }: { dates: Set<string>; cellColor: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Início: 364 dias atrás, ajustado pra começar no domingo
  const start = new Date(today);
  start.setDate(today.getDate() - 364);
  // Recuar até o domingo anterior
  start.setDate(start.getDate() - start.getDay());

  // Construir array de células (semanas)
  const weeks: Array<Array<{ iso: string; done: boolean; future: boolean }>> = [];
  const cur = new Date(start);
  let weekIdx = 0;
  let lastMonthLabel = -1;
  const monthLabels: Array<{ idx: number; label: string }> = [];
  while (cur <= today || cur.getDay() !== 0) {
    if (!weeks[weekIdx]) weeks[weekIdx] = [];
    const iso = isoDateLocal(cur);
    const future = cur > today;
    weeks[weekIdx].push({ iso, done: dates.has(iso), future });
    if (cur.getDate() <= 7 && cur.getMonth() !== lastMonthLabel) {
      monthLabels.push({ idx: weekIdx, label: MONTHS_PT[cur.getMonth()] });
      lastMonthLabel = cur.getMonth();
    }
    cur.setDate(cur.getDate() + 1);
    if (cur.getDay() === 0) weekIdx++;
    if (weekIdx > 60) break; // safety
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Month labels */}
        <div className="flex pl-7 text-[10px] text-fg-subtle">
          {weeks.map((_, i) => {
            const ml = monthLabels.find((m) => m.idx === i);
            return (
              <div key={i} className="w-[14px] text-left">
                {ml ? ml.label : ""}
              </div>
            );
          })}
        </div>
        {/* Grid */}
        <div className="flex">
          {/* Day labels (col esquerda) */}
          <div className="mr-1 flex flex-col text-[10px] text-fg-subtle">
            {DAY_LABELS.map((d, i) => (
              <div key={d} className="h-[14px] leading-[14px]" style={{ visibility: i % 2 === 1 ? "visible" : "hidden" }}>
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {Array.from({ length: 7 }).map((_, di) => {
                const cell = week[di];
                if (!cell) return <div key={di} className="h-3 w-3" />;
                if (cell.future) return <div key={di} className="h-3 w-3" />;
                return (
                  <div
                    key={di}
                    title={`${formatDate(cell.iso)} — ${cell.done ? "feito" : "não"}`}
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: cell.done ? cellColor : "hsl(var(--bg-hover-hsl, 220 14% 16%))", opacity: cell.done ? 1 : 0.3 }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthlyBars({ buckets, cellColor }: { buckets: Array<{ label: string; count: number; daysInMonth: number }>; cellColor: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="flex items-end gap-1.5">
      {buckets.map((b) => {
        const pct = (b.count / max) * 100;
        const fillPct = (b.count / b.daysInMonth) * 100;
        return (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1 text-center">
            <div className="relative flex h-24 w-full items-end overflow-hidden rounded bg-bg-subtle">
              <div className="w-full transition-all" style={{ height: `${pct}%`, backgroundColor: cellColor }} />
            </div>
            <div className="text-[10px] font-mono text-fg">{b.count}</div>
            <div className="text-[9px] text-fg-subtle">{b.label}</div>
            <div className="text-[9px] text-fg-subtle">{fillPct.toFixed(0)}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ============== utils ==============

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function computeStats(dates: string[]) {
  const set = new Set(dates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = isoDateLocal(today);

  // Streak atual
  const startOff = set.has(todayIso) ? 0 : 1;
  let currentStreak = 0;
  for (let i = startOff; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (set.has(isoDateLocal(d))) currentStreak++;
    else break;
  }

  // Streaks históricos
  const sortedDates = [...dates].sort();
  const streaks: Streak[] = [];
  let runStart: string | null = null;
  let runEnd: string | null = null;
  let runLen = 0;
  for (const iso of sortedDates) {
    if (runEnd && isNextDay(runEnd, iso)) {
      runEnd = iso;
      runLen++;
    } else {
      if (runStart && runEnd) streaks.push({ length: runLen, from: runStart, to: runEnd });
      runStart = iso;
      runEnd = iso;
      runLen = 1;
    }
  }
  if (runStart && runEnd) streaks.push({ length: runLen, from: runStart, to: runEnd });

  const topStreaks = [...streaks].sort((a, b) => b.length - a.length || b.to.localeCompare(a.to));
  const longestStreak = topStreaks[0]?.length ?? 0;

  // Por mês (12 últimos meses)
  const monthlyMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, 0);
  }
  for (const iso of dates) {
    const key = iso.slice(0, 7);
    if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
  }
  const monthly = Array.from(monthlyMap.entries()).map(([key, count]) => {
    const [y, m] = key.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    return { label: MONTHS_PT[m - 1], count, daysInMonth };
  });

  // Best month (entre os 12 mostrados)
  const best = [...monthly].sort((a, b) => b.count - a.count)[0] ?? { label: "—", count: 0, daysInMonth: 30 };

  // Total + consistencia (últimos 365 dias)
  const totalDone = dates.length;
  const consistencyPct = (totalDone / 365) * 100;

  return {
    totalDone,
    consistencyPct,
    currentStreak,
    longestStreak,
    topStreaks,
    monthly,
    bestMonth: { label: best.label, count: best.count },
  };
}

function isNextDay(a: string, b: string): boolean {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  const diff = Math.round((db.getTime() - da.getTime()) / 86400000);
  return diff === 1;
}
