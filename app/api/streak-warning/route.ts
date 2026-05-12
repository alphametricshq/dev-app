import { NextResponse } from "next/server";
import { getStreakWarningStatus } from "@/lib/streak-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getStreakWarningStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
