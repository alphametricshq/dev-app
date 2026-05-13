import { NextResponse } from "next/server";
import { reorderHabits } from "@/lib/db/habits-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n: number) => !Number.isNaN(n)) : [];
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "ids vazio" }, { status: 400 });
    }
    await reorderHabits(ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
