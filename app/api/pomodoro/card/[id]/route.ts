import { NextResponse } from "next/server";
import { listPomodoroSessionsByCard } from "@/lib/db/pomodoro-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const sessions = await listPomodoroSessionsByCard(id);
    return NextResponse.json({ ok: true, sessions });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
