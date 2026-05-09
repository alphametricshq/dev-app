import { NextResponse } from "next/server";
import { getPomodoroCountsByCard } from "@/lib/db/pomodoro-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await getPomodoroCountsByCard();
    return NextResponse.json({
      ok: true,
      counts: Object.fromEntries(counts),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
