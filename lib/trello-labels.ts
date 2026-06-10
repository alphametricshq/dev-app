import type { TrelloLabelColor } from "@/lib/integrations/trello-api";

const COLOR_MAP: Record<NonNullable<TrelloLabelColor>, { bg: string }> = {
  red:    { bg: "#ef4444" },
  orange: { bg: "#f97316" },
  yellow: { bg: "#eab308" },
  green:  { bg: "#22c55e" },
  blue:   { bg: "#3b82f6" },
  purple: { bg: "#a855f7" },
  pink:   { bg: "#ec4899" },
  sky:    { bg: "#0ea5e9" },
  lime:   { bg: "#84cc16" },
  black:  { bg: "#1f2937" },
};

export function labelBg(color: TrelloLabelColor): string {
  if (!color) return "#6b7280";
  return COLOR_MAP[color]?.bg ?? "#6b7280";
}
