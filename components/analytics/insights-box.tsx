import { Lightbulb } from "lucide-react";

export function InsightsBox({ insights, title = "Insights" }: { insights: string[]; title?: string }) {
  if (insights.length === 0) return null;
  return (
    <div className="card border-accent/30 bg-gradient-to-br from-accent/8 to-bg-card">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Lightbulb className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
      </div>
      <ul className="space-y-2">
        {insights.map((text, i) => (
          <li key={i} className="flex gap-2 text-sm text-fg-muted">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span className="[&_strong]:text-fg">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
