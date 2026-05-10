import type { TrelloLabelColor } from "@/lib/integrations/trello-api";

const COLOR_MAP: Record<NonNullable<TrelloLabelColor>, { bg: string; ring: string }> = {
  red:    { bg: "#ef4444", ring: "#fecaca" },
  orange: { bg: "#f97316", ring: "#fed7aa" },
  yellow: { bg: "#eab308", ring: "#fde68a" },
  green:  { bg: "#22c55e", ring: "#bbf7d0" },
  blue:   { bg: "#3b82f6", ring: "#bfdbfe" },
  purple: { bg: "#a855f7", ring: "#e9d5ff" },
  pink:   { bg: "#ec4899", ring: "#fbcfe8" },
  sky:    { bg: "#0ea5e9", ring: "#bae6fd" },
  lime:   { bg: "#84cc16", ring: "#d9f99d" },
  black:  { bg: "#1f2937", ring: "#9ca3af" },
};

export function labelBg(color: TrelloLabelColor): string {
  if (!color) return "#6b7280";
  return COLOR_MAP[color]?.bg ?? "#6b7280";
}

export function labelRing(color: TrelloLabelColor): string {
  if (!color) return "#d1d5db";
  return COLOR_MAP[color]?.ring ?? "#d1d5db";
}
