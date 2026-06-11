import { NextResponse } from "next/server";
import { syncGithub } from "@/lib/integrations/github";
import { syncTrello } from "@/lib/integrations/trello";
import { syncIssuesToTrello, getIssuesSyncConfig } from "@/lib/integrations/issues-to-trello";
import { syncProjectToTrello, getProjectSyncConfig } from "@/lib/integrations/project-to-trello";
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

  // GitHub e Trello são fontes independentes — rodam em paralelo.
  // (Antes era tudo em série: até ~80s no pior caso com 4 fontes.)
  const [ghResult, trResult] = await Promise.all([
    runLogged("github", async () => {
      const r = await syncGithub();
      return { itemsSynced: r.itemsSynced, message: `${r.total} contribuições` };
    }),
    runLogged("trello", async () => {
      const r = await syncTrello(90);
      return { itemsSynced: r.itemsSynced, message: `${r.meta.boards} board(s)` };
    }),
  ]);
  results.github = ghResult;
  results.trello = trResult;

  // As integrações criam cards no Trello — rodam depois (dependem do estado
  // acima e do dedupe por links), mas em paralelo entre si (locks próprios).
  const [issuesCfg, projectCfg] = await Promise.all([
    getIssuesSyncConfig().catch(() => ({ enabled: false })),
    getProjectSyncConfig().catch(() => ({ enabled: false })),
  ]);

  const integrationRuns: Promise<void>[] = [];
  if (issuesCfg.enabled) {
    integrationRuns.push(
      runLogged("issues", async () => {
        const r = await syncIssuesToTrello();
        return { itemsSynced: r.created, message: `${r.created} card(s) de issues` };
      }).then((r) => {
        results.issues = r;
      }),
    );
  }
  if (projectCfg.enabled) {
    integrationRuns.push(
      runLogged("project", async () => {
        const r = await syncProjectToTrello();
        return { itemsSynced: r.created, message: `${r.created} card(s) do project` };
      }).then((r) => {
        results.project = r;
      }),
    );
  }
  await Promise.all(integrationRuns);

  const anyOk = Object.values(results).some((r) => r.ok);
  const allOk = Object.values(results).every((r) => r.ok);
  const message = allOk
    ? `OK · GH ${results.github.itemsSynced ?? 0} · Trello ${results.trello.itemsSynced ?? 0}${results.issues ? ` · Issues ${results.issues.itemsSynced ?? 0}` : ""}${results.project ? ` · Project ${results.project.itemsSynced ?? 0}` : ""}`
    : Object.entries(results)
        .filter(([, v]) => !v.ok)
        .map(([k, v]) => `${k}: ${v.error}`)
        .join(" · ");

  return NextResponse.json(
    { ok: allOk, results, message },
    { status: anyOk ? 200 : 500 }
  );
}
