import { NextResponse } from "next/server";
import { syncGithub } from "@/lib/integrations/github";
import { logSyncStart, logSyncFinish } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncResult = { ok: boolean; itemsSynced?: number; error?: string };

async function runLogged(
  source: string,
  fn: () => Promise<{ itemsSynced: number; message: string }>,
): Promise<SyncResult> {
  const id = await logSyncStart(source);
  try {
    const r = await fn();
    await logSyncFinish(id, "success", r.itemsSynced, r.message);
    return { ok: true, itemsSynced: r.itemsSynced };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await logSyncFinish(id, "error", 0, msg);
    return { ok: false, error: msg };
  }
}

export async function POST() {
  const results: Record<string, SyncResult> = {};

  results.github = await runLogged("github", async () => {
    const r = await syncGithub();
    return { itemsSynced: r.itemsSynced, message: `${r.total} contribuições` };
  });

  const allOk = results.github.ok;
  const message = allOk
    ? `OK · GH ${results.github.itemsSynced ?? 0}`
    : `github: ${results.github.error}`;

  return NextResponse.json(
    { ok: allOk, results, message },
    { status: allOk ? 200 : 500 }
  );
}
