import { NextResponse } from "next/server";
import { getManifest } from "@/lib/sdk/manifest-source";
import { installComponent, type InstallResult } from "@/lib/sdk/install";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  ids: string[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<RequestBody>;
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ ok: false, error: "ids vazio" }, { status: 400 });
    }
    const manifest = await getManifest({ force: true });
    const map = new Map(manifest.components.map((c) => [c.id, c]));

    const results: InstallResult[] = [];
    // Serial — evita corrida no .mcp.json e dá log incremental previsível
    for (const id of body.ids) {
      const c = map.get(id);
      if (!c) {
        results.push({ kind: "error", component: id, error: "id desconhecido" });
        continue;
      }
      results.push(await installComponent(c));
    }
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
