import { NextResponse } from "next/server";
import { computeGoals } from "@/lib/gamification/goals";
import { getGithubContributions, getTrelloCompletedByDay } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [contribs, tasksByDay] = await Promise.all([
      getGithubContributions(60),
      getTrelloCompletedByDay(60),
    ]);
    const goals = await computeGoals({ contribs, tasksByDay });
    return NextResponse.json({ ok: true, goals });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
