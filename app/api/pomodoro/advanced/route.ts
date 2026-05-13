import { NextResponse } from "next/server";
import {
  getFocusMinutesByDay,
  getTopFocusedCards,
  getWeekComparison,
} from "@/lib/db/pomodoro-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [byDay, topCards, weekComparison] = await Promise.all([
      getFocusMinutesByDay(30),
      getTopFocusedCards(5, 90),
      getWeekComparison(),
    ]);
    return NextResponse.json({ ok: true, byDay, topCards, weekComparison });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
