import { NextResponse } from "next/server";
import { syncIssuesToTrello } from "@/lib/integrations/issues-to-trello";
import { logSyncStart, logSyncFinish } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const id = await logSyncStart("issues");
  try {
    const { created, skipped } = await syncIssuesToTrello();
    await logSyncFinish(id, "success", created, `${created} card(s) criado(s), ${skipped} já existiam`);
    return NextResponse.json({ ok: true, created, skipped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await logSyncFinish(id, "error", 0, msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
