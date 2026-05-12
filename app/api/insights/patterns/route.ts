import { NextResponse } from "next/server";
import { computePatterns } from "@/lib/insights/patterns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const patterns = await computePatterns();
    return NextResponse.json({ ok: true, patterns });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
