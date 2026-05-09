import { NextResponse } from "next/server";
import { searchCards } from "@/lib/integrations/trello-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    if (q.trim().length < 2) {
      return NextResponse.json({ ok: true, cards: [] });
    }
    const cards = await searchCards(q);
    return NextResponse.json({ ok: true, cards });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
