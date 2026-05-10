import { NextResponse } from "next/server";
import { getHabitHistory, getHabitById } from "@/lib/db/habits-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const habitId = Number(id);
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? 365);
    const [habit, dates] = await Promise.all([
      getHabitById(habitId),
      getHabitHistory(habitId, days),
    ]);
    if (!habit) {
      return NextResponse.json({ ok: false, error: "Hábito não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, habit, dates });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
