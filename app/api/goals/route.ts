import { NextResponse } from "next/server";
import { getGoalsConfig, setGoalsConfig, DEFAULT_GOALS, type GoalsConfig } from "@/lib/gamification/goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getGoalsConfig();
    return NextResponse.json({ ok: true, goals: config, defaults: DEFAULT_GOALS });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

function sanitize(input: unknown): GoalsConfig | null {
  if (typeof input !== "object" || !input) return null;
  const i = input as Record<string, unknown>;
  function getNum(period: string, source: string, fallback: number): number {
    const p = i[period] as Record<string, unknown> | undefined;
    if (!p) return fallback;
    const v = p[source];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.round(v);
    return fallback;
  }
  return {
    daily: {
      github: getNum("daily", "github", DEFAULT_GOALS.daily.github),
      trello: getNum("daily", "trello", DEFAULT_GOALS.daily.trello),
    },
    weekly: {
      github: getNum("weekly", "github", DEFAULT_GOALS.weekly.github),
      trello: getNum("weekly", "trello", DEFAULT_GOALS.weekly.trello),
    },
    monthly: {
      github: getNum("monthly", "github", DEFAULT_GOALS.monthly.github),
      trello: getNum("monthly", "trello", DEFAULT_GOALS.monthly.trello),
    },
  };
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const config = sanitize(body);
    if (!config) {
      return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
    }
    await setGoalsConfig(config);
    return NextResponse.json({ ok: true, goals: config });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
