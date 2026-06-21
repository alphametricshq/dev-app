import { CheckCircle2, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalProgress } from "@/lib/gamification/goals";

export function GoalsList({ goals }: { goals: GoalProgress[] }) {
  return (
    <div className="space-y-3">
      {goals.map((g) => (
        <GoalCard key={g.period} goal={g} />
      ))}
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalProgress }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        goal.completed
          ? "border-success/40 bg-success/5"
          : "border-border bg-bg-card",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-fg">{goal.label}</h4>
        {goal.completed ? (
          <span className="flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Concluída
          </span>
        ) : (
          <span className="text-xs text-fg-muted">Em andamento</span>
        )}
      </div>

      <div className="space-y-2.5">
        <GoalRow
          icon={GitCommit}
          label="Contribuições GitHub"
          current={goal.github.current}
          target={goal.github.target}
          pct={goal.github.pct}
          colorClass="bg-success"
        />
      </div>
    </div>
  );
}

function GoalRow({
  icon: Icon,
  label,
  current,
  target,
  pct,
  colorClass,
}: {
  icon: typeof GitCommit;
  label: string;
  current: number;
  target: number;
  pct: number;
  colorClass: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-fg-muted">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-mono text-fg">
          {current} / {target}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
        <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
