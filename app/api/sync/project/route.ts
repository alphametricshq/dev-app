import { NextResponse } from "next/server";
import { syncProjectToTrello } from "@/lib/integrations/project-to-trello";
import { logSyncStart, logSyncFinish } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const id = await logSyncStart("project");
  try {
    const { created, skipped } = await syncProjectToTrello();
    await logSyncFinish(id, "success", created, `${created} card(s), ${skipped} já existiam`);
    return NextResponse.json({ ok: true, created, skipped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await logSyncFinish(id, "error", 0, msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
