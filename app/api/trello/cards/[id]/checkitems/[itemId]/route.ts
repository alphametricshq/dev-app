import { NextResponse } from "next/server";
import { updateCheckItem } from "@/lib/integrations/trello-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await ctx.params;
    const body = await req.json();
    const update: { state?: "complete" | "incomplete"; name?: string } = {};
    if (body.state === "complete" || body.state === "incomplete") update.state = body.state;
    if (typeof body.name === "string") update.name = body.name.trim();
    const item = await updateCheckItem(id, itemId, update);
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
