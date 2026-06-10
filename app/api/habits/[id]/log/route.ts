import { NextResponse } from "next/server";
import { logHabit, unlogHabit } from "@/lib/db/habits-queries";
import { localIsoDate } from "@/lib/local-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isoToday(): string {
  // Data LOCAL — toISOString() (UTC) gravava o hábito no dia seguinte após as 21h
  return localIsoDate();
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const habitId = Number(id);
    const body = await req.json().catch(() => ({}));
    const date = typeof body.date === "string" ? body.date : isoToday();
    await logHabit(habitId, date);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const habitId = Number(id);
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? isoToday();
    await unlogHabit(habitId, date);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
