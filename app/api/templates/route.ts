import { NextResponse } from "next/server";
import { listTemplates, createTemplate } from "@/lib/db/templates-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") as "card" | "habit" | null;
    const templates = await listTemplates(type ?? undefined);
    return NextResponse.json({ ok: true, templates });
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
    if (!body?.type || !body?.name || !body?.data) {
      return NextResponse.json(
        { ok: false, error: "type, name e data obrigatórios" },
        { status: 400 },
      );
    }
    if (body.type !== "card" && body.type !== "habit") {
      return NextResponse.json({ ok: false, error: "type inválido" }, { status: 400 });
    }
    const template = await createTemplate(body.type, String(body.name).trim(), body.data);
    return NextResponse.json({ ok: true, template });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
