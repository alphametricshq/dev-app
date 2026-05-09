import { NextResponse } from "next/server";
import { getWeeklyReview } from "@/lib/weekly-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const weeksAgo = Math.max(0, Math.min(12, Number(url.searchParams.get("weeksAgo") ?? 0)));
    const review = await getWeeklyReview(weeksAgo);
    return NextResponse.json({ ok: true, review });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
