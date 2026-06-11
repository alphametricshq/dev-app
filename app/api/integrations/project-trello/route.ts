import { NextResponse } from "next/server";
import {
  getProjectSyncConfig,
  setProjectSyncConfig,
  baselineProject,
} from "@/lib/integrations/project-to-trello";
import { listRecentIssueLinks } from "@/lib/db/issues-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfg = await getProjectSyncConfig();
    // Filtro na query: antes pegava os 5 mais recentes GERAIS e filtrava,
    // podendo mostrar menos de 5 (ou nada) mesmo com links do project
    const recent = await listRecentIssueLinks(5, "project");
    return NextResponse.json({ ok: true, config: cfg, recent });
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
    const prev = await getProjectSyncConfig();
    const next = {
      enabled: typeof body.enabled === "boolean" ? body.enabled : prev.enabled,
      org: typeof body.org === "string" && body.org.trim() ? body.org.trim() : prev.org,
      projectNumber: typeof body.projectNumber === "number" ? body.projectNumber : prev.projectNumber,
      statuses: Array.isArray(body.statuses) && body.statuses.length > 0 ? body.statuses : prev.statuses,
    };
    await setProjectSyncConfig(next);

    // importExisting=true: liga SEM baseline, pra que os itens atuais virem card
    // no próximo sync. Sem isso, ao ligar faz baseline (só novos viram card).
    const importExisting = body.importExisting === true;

    let baselined = 0;
    if (next.enabled && !prev.enabled && !importExisting) {
      try {
        const r = await baselineProject();
        baselined = r.baselined;
      } catch {
        // mantém habilitado mesmo se baseline falhar
      }
    }
    return NextResponse.json({ ok: true, config: next, baselined });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
