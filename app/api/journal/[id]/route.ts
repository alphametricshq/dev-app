import { NextResponse } from "next/server";
import { updateJournalEntry, deleteJournalEntry } from "@/lib/db/journal-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const entryId = Number(id);
    if (!Number.isFinite(entryId)) {
      return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
    }
    const body = await req.json();
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean)
      : undefined;
    await updateJournalEntry(entryId, {
      content: typeof body.content === "string" ? body.content.trim() : undefined,
      tags,
      mood: typeof body.mood === "string" ? body.mood.slice(0, 4) : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await deleteJournalEntry(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
