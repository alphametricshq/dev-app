"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Brain, Clock, Flame, Calendar } from "lucide-react";
import { PomodoroTimer } from "./timer";
import { SessionsHistory } from "./sessions-history";
import { FocusMinutesChart } from "./focus-minutes-chart";
import { TopCardsRanking } from "./top-cards-ranking";
import { WeekComparisonCard } from "./week-comparison-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { usePomodoroState } from "@/lib/use-pomodoro";
import type {
  PomodoroSession,
  PomodoroStats,
  FocusByDay,
  TopCard,
  WeekComparison,
} from "@/lib/db/pomodoro-queries";

type AdvancedStats = {
  byDay: FocusByDay[];
  topCards: TopCard[];
  weekComparison: WeekComparison;
};

export function FocusPageClient() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const pomodoro = usePomodoroState();
  const lastStatusRef = useRef(pomodoro?.status);

  useEffect(() => {
    refresh();
  }, []);

  // Quando status volta pra idle (sessão completou), refresh
  useEffect(() => {
    const last = lastStatusRef.current;
    const current = pomodoro?.status;
    if (last && last !== "idle" && current === "idle") {
      // pequeno delay pra garantir que o POST registrou
      setTimeout(() => refresh(), 500);
    }
    lastStatusRef.current = current;
  }, [pomodoro?.status]);

  async function refresh() {
    setLoading(true);
    try {
      const [resStats, resAdv] = await Promise.all([
        fetch("/api/pomodoro"),
        fetch("/api/pomodoro/advanced"),
      ]);
      const stats = await resStats.json();
      const adv = await resAdv.json();
      if (stats?.ok) {
        setSessions(stats.sessions);
        setStats(stats.stats);
      }
      if (adv?.ok) {
        setAdvanced({
          byDay: adv.byDay ?? [],
          topCards: adv.topCards ?? [],
          weekComparison: adv.weekComparison,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-fg-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Hoje"
          value={stats?.todaySessions ?? 0}
          hint={`${stats?.todayFocusMin ?? 0} min de foco`}
          icon={Brain}
        />
        {advanced ? (
          <WeekComparisonCard data={advanced.weekComparison} />
        ) : (
          <StatCard
            label="Esta semana"
            value={stats?.weekSessions ?? 0}
            hint={`${stats?.weekFocusMin ?? 0} min`}
            icon={Calendar}
          />
        )}
        <StatCard
          label="Total"
          value={stats?.totalSessions ?? 0}
          hint={`${formatHours(stats?.totalFocusMin ?? 0)} acumulados`}
          icon={Clock}
        />
        <StatCard
          label="Melhor dia"
          value={stats?.longestDay?.sessions ?? 0}
          hint={stats?.longestDay?.date ?? "—"}
          icon={Flame}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PomodoroTimer onSessionComplete={refresh} />
        </div>
        <SessionsHistory sessions={sessions} />
      </div>

      {advanced && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FocusMinutesChart data={advanced.byDay} />
          </div>
          <TopCardsRanking cards={advanced.topCards} />
        </div>
      )}
    </div>
  );
}

function formatHours(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}
