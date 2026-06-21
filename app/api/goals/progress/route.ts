import { NextResponse } from "next/server";
import { computeGoals } from "@/lib/gamification/goals";
import { getGithubContributions } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const contribs = await getGithubContributions(60);
    const goals = await computeGoals({ contribs });
    return NextResponse.json({ ok: true, goals });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
