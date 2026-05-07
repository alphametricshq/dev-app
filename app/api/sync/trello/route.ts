import { NextResponse } from "next/server";
import { syncTrello } from "@/lib/integrations/trello";
import { logSyncStart, logSyncFinish } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const id = await logSyncStart("trello");
  try {
    const { itemsSynced, meta } = await syncTrello(90);
    await logSyncFinish(
      id,
      "success",
      itemsSynced,
      `${meta.boards} board(s), ${meta.doneLists} lista(s) Done`
    );
    return NextResponse.json({ ok: true, itemsSynced, meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await logSyncFinish(id, "error", 0, msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
