import { NextResponse } from "next/server";
import { runSyncTick, getAutoSyncIntervalMinutes } from "@/lib/auto-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint interno disparado pelo setInterval do main process Electron.
// Autenticacao por header X-Internal-Token (token gerado no boot do main
// e injetado no serverProcess via env INTERNAL_SYNC_TOKEN — nunca exposto
// ao renderer/browser).
export async function POST(req: Request) {
  const expected = process.env.INTERNAL_SYNC_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "INTERNAL_SYNC_TOKEN nao configurado no server" },
      { status: 503 },
    );
  }
  const provided = req.headers.get("x-internal-token");
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "token invalido" }, { status: 401 });
  }
  try {
    const result = await runSyncTick();
    const nextIntervalMin = getAutoSyncIntervalMinutes();
    return NextResponse.json({ ok: true, result, nextIntervalMin });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
