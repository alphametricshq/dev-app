import { NextResponse } from "next/server";
import { getHabitsCalendar } from "@/lib/db/habits-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month"); // YYYY-MM
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      if (y && m) {
        year = y;
        month = m;
      }
    }
    const data = await getHabitsCalendar(year, month);
    return NextResponse.json({ ok: true, year, month, ...data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
