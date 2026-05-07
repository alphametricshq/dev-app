import { NextResponse } from "next/server";
import { syncGithub } from "@/lib/integrations/github";
import { logSyncStart, logSyncFinish } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const id = await logSyncStart("github");
  try {
    const { itemsSynced, total } = await syncGithub();
    await logSyncFinish(id, "success", itemsSynced, `${total} contribuições no período`);
    return NextResponse.json({ ok: true, itemsSynced, total });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await logSyncFinish(id, "error", 0, msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
