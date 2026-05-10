import { NextResponse } from "next/server";
import { getChecklistsForCard, createChecklist } from "@/lib/integrations/trello-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const checklists = await getChecklistsForCard(id);
    return NextResponse.json({ ok: true, checklists });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ ok: false, error: "name obrigatório" }, { status: 400 });
    }
    const checklist = await createChecklist({ idCard: id, name: body.name.trim() });
    return NextResponse.json({ ok: true, checklist });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
