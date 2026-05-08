import { NextResponse } from "next/server";
import { getMyBoards } from "@/lib/integrations/trello-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const boards = await getMyBoards();
    return NextResponse.json({ ok: true, boards });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erro desconhecido";
}
