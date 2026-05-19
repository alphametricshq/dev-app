import { NextResponse } from "next/server";
import { getValidatedPinnedCards } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cards = await getValidatedPinnedCards(10);
    return NextResponse.json({ ok: true, cards });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
