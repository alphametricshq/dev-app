import { NextResponse } from "next/server";
import { listHabitsWithStats, createHabit } from "@/lib/db/habits-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const habits = await listHabitsWithStats();
    return NextResponse.json({ ok: true, habits });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ ok: false, error: "name obrigatório" }, { status: 400 });
    }
    const habit = await createHabit({
      name: body.name.trim(),
      emoji: body.emoji,
      color: body.color,
      target_per_week: body.target_per_week,
    });
    return NextResponse.json({ ok: true, habit });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
