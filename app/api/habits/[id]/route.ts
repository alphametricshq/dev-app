import { NextResponse } from "next/server";
import { updateHabit, archiveHabit } from "@/lib/db/habits-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const habitId = Number(id);
    if (!Number.isFinite(habitId)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }
    const body = await req.json();
    await updateHabit(habitId, {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      emoji: body.emoji,
      color: body.color,
      target_per_week:
        typeof body.target_per_week === "number" ? body.target_per_week : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await archiveHabit(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
