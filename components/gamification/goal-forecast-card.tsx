import { GitCommit, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalProgress } from "@/lib/gamification/goals";
import { computeForecast, STATUS_LABELS, type GoalStatus } from "@/lib/forecast";

export function GoalForecastList({ goals }: { goals: GoalProgress[] }) {
  return (
    <div className="space-y-3">
      {goals.map((g) => (
        <GoalForecastCard key={g.period} goal={g} />
      ))}
    </div>
  );
}

export function GoalForecastCard({ goal }: { goal: GoalProgress }) {
  const forecast = computeForecast(goal);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        goal.completed ? "border-success/40 bg-success/5" : "border-border bg-bg-card",
      )}
    >
      <header className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-fg">{goal.label}</h4>
        <span className="text-[11px] text-fg-muted">
          {goal.period === "daily"
            ? "1 dia"
            : `dia ${forecast.daysElapsed} de ${forecast.daysTotal}`}
        </span>
      </header>

      <div className="space-y-3">
        <ForecastRow
          icon={GitCommit}
          label="GitHub"
          colorClass="bg-success"
          current={goal.github.current}
          target={goal.github.target}
          pct={goal.github.pct}
          expected={forecast.expectedNow.github}
          status={forecast.status.github}
          rate={forecast.rate.github}
          daysToComplete={forecast.daysToComplete.github}
          perDayNeeded={forecast.perDayNeeded.github}
          daysRemaining={forecast.daysRemaining}
          totalDays={forecast.daysTotal}
        />
      </div>
    </div>
  );
}

function ForecastRow({
  icon: Icon,
  label,
  colorClass,
  current,
  target,
  pct,
  expected,
  status,
  rate,
  daysToComplete,
  perDayNeeded,
  daysRemaining,
  totalDays,
}: {
  icon: typeof GitCommit;
  label: string;
  colorClass: string;
  current: number;
  target: number;
  pct: number;
  expected: number;
  status: GoalStatus;
  rate: number;
  daysToComplete: number | null;
  perDayNeeded: number;
  daysRemaining: number;
  totalDays: number;
}) {
  const meta = STATUS_LABELS[status];
  const expectedPct = target > 0 ? Math.min(100, (expected / target) * 100) : 0;
  const completed = status === "completed";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-fg-muted">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              meta.cls,
            )}
          >
            {meta.label}
          </span>
          <span className="font-mono text-fg">
            {current} / {target}
          </span>
        </div>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
        {!completed && totalDays > 1 && (
          <div
            className="absolute top-0 h-full w-px bg-fg/40"
            style={{ left: `${expectedPct}%` }}
            title={`Esperado pra hoje: ${Math.round(expected)}`}
          />
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-fg-subtle">
        {completed ? (
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3 w-3" />
            Meta batida!
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              ritmo: {rate.toFixed(1)}/dia
            </span>
            {daysRemaining > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                precisa {perDayNeeded}/dia restantes ({daysRemaining}d)
              </span>
            )}
            {daysToComplete != null && daysToComplete > 0 && (
              <span>
                no ritmo bate em <span className="text-fg">{daysToComplete}d</span>
              </span>
            )}
            {daysToComplete == null && (
              <span className="text-warning">ritmo insuficiente</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
