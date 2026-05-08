import { NextResponse } from "next/server";
import { createCard } from "@/lib/integrations/trello-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.idList || !body?.name) {
      return NextResponse.json({ ok: false, error: "idList e name obrigatórios" }, { status: 400 });
    }
    const card = await createCard({
      idList: String(body.idList),
      name: String(body.name),
      desc: body.desc ? String(body.desc) : undefined,
      pos: body.pos,
    });
    return NextResponse.json({ ok: true, card });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erro desconhecido";
}
