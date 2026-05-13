import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeekComparison } from "@/lib/db/pomodoro-queries";

export function WeekComparisonCard({ data }: { data: WeekComparison }) {
  const { currentWeekMin, previousWeekMin, currentWeekSessions, deltaPct } = data;
  const goingUp = deltaPct !== null && deltaPct > 0;
  const goingDown = deltaPct !== null && deltaPct < 0;
  const flat = deltaPct === null || Math.abs(deltaPct ?? 0) < 1;

  return (
    <div className="card">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-muted">
          Esta semana
        </div>
        {!flat &&
          (goingUp ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : goingDown ? (
            <TrendingDown className="h-4 w-4 text-danger" />
          ) : (
            <Minus className="h-4 w-4 text-fg-subtle" />
          ))}
      </div>
      <div className="text-3xl font-semibold tracking-tight text-fg">
        {formatMin(currentWeekMin)}
      </div>
      <div className="mt-1 text-xs text-fg-subtle">
        {currentWeekSessions} sessão{currentWeekSessions === 1 ? "" : "es"} ·{" "}
        <span className="text-fg-muted">{formatMin(previousWeekMin)}</span> semana passada
      </div>
      {deltaPct !== null && !flat && (
        <div
          className={cn(
            "mt-2 text-xs font-medium",
            goingUp ? "text-success" : "text-danger",
          )}
        >
          {goingUp ? "+" : ""}
          {Math.round(deltaPct)}% vs semana anterior
        </div>
      )}
    </div>
  );
}

function formatMin(min: number): string {
  if (min === 0) return "0min";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}
