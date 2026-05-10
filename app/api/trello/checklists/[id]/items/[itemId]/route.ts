import { NextResponse } from "next/server";
import { deleteCheckItem } from "@/lib/integrations/trello-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await ctx.params;
    await deleteCheckItem(id, itemId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
