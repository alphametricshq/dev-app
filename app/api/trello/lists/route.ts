import { NextResponse } from "next/server";
import { createList } from "@/lib/integrations/trello-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.idBoard || !body?.name) {
      return NextResponse.json({ ok: false, error: "idBoard e name obrigatórios" }, { status: 400 });
    }
    const list = await createList({
      idBoard: String(body.idBoard),
      name: String(body.name),
      pos: body.pos,
    });
    return NextResponse.json({ ok: true, list });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erro desconhecido";
}
