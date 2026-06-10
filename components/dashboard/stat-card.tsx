import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./sparkline";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  sparkline,
  accent = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  sparkline?: number[];
  accent?: "default" | "github" | "trello";
}) {
  const accentClass = {
    default: "text-accent bg-accent/15",
    github: "text-success bg-success/15",
    trello: "text-warning bg-warning/15",
  }[accent];

  const sparklineColor = {
    default: "hsl(var(--accent))",
    github: "hsl(150 60% 50%)",
    trello: "hsl(40 90% 60%)",
  }[accent];

  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-fg-muted">{label}</div>
        {Icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accentClass)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-3xl font-semibold tracking-tight text-fg">{value}</div>
        {sparkline && sparkline.length > 0 && (
          <Sparkline values={sparkline} color={sparklineColor} />
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend && (
          <span className={cn("font-medium", trend.value >= 0 ? "text-success" : "text-danger")}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
        )}
        {hint && <span className="text-fg-subtle">{hint}</span>}
      </div>
    </div>
  );
}
