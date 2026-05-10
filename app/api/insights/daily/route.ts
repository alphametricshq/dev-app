import { NextResponse } from "next/server";
import { computeDailyInsight } from "@/lib/daily-insight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const insight = await computeDailyInsight();
    return NextResponse.json({ ok: true, insight });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
