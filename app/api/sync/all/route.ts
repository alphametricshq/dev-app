import { NextResponse } from "next/server";
import { syncGithub } from "@/lib/integrations/github";
import { syncTrello } from "@/lib/integrations/trello";
import { syncIssuesToTrello, getIssuesSyncConfig } from "@/lib/integrations/issues-to-trello";
import { syncProjectToTrello, getProjectSyncConfig } from "@/lib/integrations/project-to-trello";
import { logSyncStart, logSyncFinish } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const results: Record<string, { ok: boolean; itemsSynced?: number; error?: string }> = {};

  // GitHub
  const ghId = await logSyncStart("github");
  try {
    const r = await syncGithub();
    results.github = { ok: true, itemsSynced: r.itemsSynced };
    await logSyncFinish(ghId, "success", r.itemsSynced, `${r.total} contribuições`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    results.github = { ok: false, error: msg };
    await logSyncFinish(ghId, "error", 0, msg);
  }

  // Trello
  const trId = await logSyncStart("trello");
  try {
    const r = await syncTrello(90);
    results.trello = { ok: true, itemsSynced: r.itemsSynced };
    await logSyncFinish(trId, "success", r.itemsSynced, `${r.meta.boards} board(s)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    results.trello = { ok: false, error: msg };
    await logSyncFinish(trId, "error", 0, msg);
  }

  // Issues → Trello (só se a integração estiver ligada)
  try {
    const cfg = await getIssuesSyncConfig();
    if (cfg.enabled) {
      const issId = await logSyncStart("issues");
      try {
        const r = await syncIssuesToTrello();
        results.issues = { ok: true, itemsSynced: r.created };
        await logSyncFinish(issId, "success", r.created, `${r.created} card(s) de issues`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        results.issues = { ok: false, error: msg };
        await logSyncFinish(issId, "error", 0, msg);
      }
    }
  } catch {
    // ignora se não conseguir ler config
  }

  // GitHub Project → Trello (só se a integração estiver ligada)
  try {
    const pcfg = await getProjectSyncConfig();
    if (pcfg.enabled) {
      const prId = await logSyncStart("project");
      try {
        const r = await syncProjectToTrello();
        results.project = { ok: true, itemsSynced: r.created };
        await logSyncFinish(prId, "success", r.created, `${r.created} card(s) do project`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        results.project = { ok: false, error: msg };
        await logSyncFinish(prId, "error", 0, msg);
      }
    }
  } catch {
    // ignora
  }

  const anyOk = Object.values(results).some((r) => r.ok);
  const allOk = Object.values(results).every((r) => r.ok);
  const message = allOk
    ? `OK · GH ${results.github.itemsSynced ?? 0} · Trello ${results.trello.itemsSynced ?? 0}${results.issues ? ` · Issues ${results.issues.itemsSynced ?? 0}` : ""}`
    : Object.entries(results)
        .filter(([, v]) => !v.ok)
        .map(([k, v]) => `${k}: ${v.error}`)
        .join(" · ");

  return NextResponse.json(
    { ok: allOk, results, message },
    { status: anyOk ? 200 : 500 }
  );
}
