import { NextResponse } from "next/server";
import { importData } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await importData(body);
    return NextResponse.json({ ok: true, counts: result.counts });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 400 },
    );
  }
}
