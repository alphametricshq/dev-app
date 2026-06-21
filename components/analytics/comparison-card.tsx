import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Comparison } from "@/lib/analytics/github";

export function ComparisonCard({
  label,
  comparison,
  unit = "",
  accent = "default",
}: {
  label: string;
  comparison: Comparison;
  unit?: string;
  accent?: "default" | "github";
}) {
  const { current, previous, deltaPct } = comparison;
  const trend = deltaPct == null ? "neutral" : deltaPct > 0.5 ? "up" : deltaPct < -0.5 ? "down" : "neutral";

  const accentBg = {
    default: "bg-accent/10",
    github: "bg-success/10",
  }[accent];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-fg-muted";

  return (
    <div className={cn("card", accentBg)}>
      <div className="text-xs font-medium uppercase tracking-wider text-fg-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-fg">{current.toLocaleString("pt-BR")}</span>
        {unit && <span className="text-sm text-fg-muted">{unit}</span>}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={cn("inline-flex items-center gap-1 font-medium", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {deltaPct == null
            ? "—"
            : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(0)}%`}
        </span>
        <span className="text-fg-subtle">vs anterior ({previous.toLocaleString("pt-BR")})</span>
      </div>
    </div>
  );
}
