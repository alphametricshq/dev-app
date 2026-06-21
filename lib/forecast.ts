import type { GoalProgress } from "@/lib/gamification/goals";

export type GoalStatus = "completed" | "ahead" | "on-track" | "behind";

export type GoalForecast = {
  period: GoalProgress["period"];
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  expectedNow: { github: number };
  status: { github: GoalStatus };
  rate: { github: number };
  daysToComplete: { github: number | null };
  perDayNeeded: { github: number };
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function statusFor(current: number, expected: number, target: number): GoalStatus {
  if (current >= target) return "completed";
  if (expected === 0) return current > 0 ? "ahead" : "on-track";
  if (current >= expected) return "ahead";
  if (current >= expected * 0.7) return "on-track";
  return "behind";
}

export function computeForecast(goal: GoalProgress, today: Date = new Date()): GoalForecast {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);

  let daysElapsed = 1;
  let daysTotal = 1;

  if (goal.period === "daily") {
    daysElapsed = 1;
    daysTotal = 1;
  } else if (goal.period === "weekly") {
    const dayOfWeek = (t.getDay() + 6) % 7;
    daysElapsed = dayOfWeek + 1;
    daysTotal = 7;
  } else if (goal.period === "monthly") {
    daysElapsed = t.getDate();
    daysTotal = daysInMonth(t.getFullYear(), t.getMonth());
  }

  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  function calc(current: number, target: number) {
    const expected = (daysElapsed / daysTotal) * target;
    const status = statusFor(current, expected, target);
    const rate = daysElapsed > 0 ? current / daysElapsed : 0;
    const remaining = Math.max(0, target - current);
    let daysToComplete: number | null = null;
    if (current >= target) daysToComplete = 0;
    else if (rate > 0) daysToComplete = Math.ceil(remaining / rate);
    const perDayNeeded = daysRemaining > 0 ? Math.ceil(remaining / daysRemaining) : remaining;
    return { expected, status, rate, daysToComplete, perDayNeeded };
  }

  const gh = calc(goal.github.current, goal.github.target);

  return {
    period: goal.period,
    daysElapsed,
    daysTotal,
    daysRemaining,
    expectedNow: { github: gh.expected },
    status: { github: gh.status },
    rate: { github: gh.rate },
    daysToComplete: { github: gh.daysToComplete },
    perDayNeeded: { github: gh.perDayNeeded },
  };
}

export const STATUS_LABELS: Record<GoalStatus, { label: string; cls: string }> = {
  completed: { label: "Concluída", cls: "bg-success/15 text-success border-success/40" },
  ahead: { label: "Adiantado", cls: "bg-success/15 text-success border-success/40" },
  "on-track": { label: "No caminho", cls: "bg-accent/15 text-accent border-accent/40" },
  behind: { label: "Atrasado", cls: "bg-warning/15 text-warning border-warning/40" },
};
