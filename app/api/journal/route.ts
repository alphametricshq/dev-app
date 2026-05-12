import { NextResponse } from "next/server";
import {
  listJournalEntries,
  createJournalEntry,
  getAllJournalTags,
  getJournalStats,
} from "@/lib/db/journal-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") ?? undefined;
    const tag = url.searchParams.get("tag") ?? undefined;
    const fromDate = url.searchParams.get("from") ?? undefined;
    const toDate = url.searchParams.get("to") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.max(1, Math.min(10000, Number(limitRaw))) : 200;

    const [entries, tags, stats] = await Promise.all([
      listJournalEntries({ query, tag, fromDate, toDate, limit }),
      getAllJournalTags(),
      getJournalStats(),
    ]);
    return NextResponse.json({ ok: true, entries, tags, stats });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ ok: false, error: "content vazio" }, { status: 400 });
    }
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean)
      : [];
    const mood = typeof body.mood === "string" ? body.mood.slice(0, 4) : "";
    const entry = await createJournalEntry({ content, tags, mood });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
