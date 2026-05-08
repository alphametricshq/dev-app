import { NextResponse } from "next/server";
import { updateCard, deleteCard } from "@/lib/integrations/trello-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const card = await updateCard(id, {
      name: body.name,
      desc: body.desc,
      idList: body.idList,
      pos: body.pos,
      closed: body.closed,
    });
    return NextResponse.json({ ok: true, card });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await deleteCard(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Erro desconhecido";
}
