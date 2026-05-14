import { NextResponse } from "next/server";
import { getHabitsYearly } from "@/lib/db/habits-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const habitParam = url.searchParams.get("habit");
    const habitId = habitParam && habitParam !== "all" ? Number(habitParam) : null;
    const data = await getHabitsYearly(habitId);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
