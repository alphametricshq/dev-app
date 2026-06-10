// Mapa único de cores de hábito -> valor CSS utilizável em style/SVG.
// Os tons espelham os tokens do tailwind.config.ts (success/warning/danger)
// pra mesma cor não divergir entre telas que usam classes (bg-success etc.)
// e telas que pintam via style inline.
export const HABIT_COLOR_CSS: Record<string, string> = {
  accent: "hsl(var(--accent))",
  success: "hsl(150 60% 50%)",
  warning: "hsl(40 90% 60%)",
  danger: "hsl(0 70% 60%)",
  blue: "hsl(200 80% 60%)",
  pink: "hsl(320 70% 65%)",
};

export function habitColorCss(color: string): string {
  return HABIT_COLOR_CSS[color] ?? HABIT_COLOR_CSS.accent;
}
