import { NextResponse } from "next/server";
import {
  getIssuesSyncConfig,
  setIssuesSyncConfig,
  baselineIssues,
} from "@/lib/integrations/issues-to-trello";
import { countLinkedIssues, listRecentIssueLinks } from "@/lib/db/issues-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfg = await getIssuesSyncConfig();
    // Só links da integração de Issues — os do Project têm painel próprio
    const [count, recent] = await Promise.all([
      countLinkedIssues("issues"),
      listRecentIssueLinks(5, "issues"),
    ]);
    return NextResponse.json({ ok: true, enabled: cfg.enabled, totalLinked: count, recent });
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
    const enabled = !!body?.enabled;
    const cfg = await getIssuesSyncConfig();
    await setIssuesSyncConfig({ enabled });

    // Ao LIGAR pela primeira vez, faz baseline pra não converter issues antigas
    let baselined = 0;
    if (enabled && !cfg.enabled) {
      try {
        const r = await baselineIssues();
        baselined = r.baselined;
      } catch {
        // se baseline falhar (ex: token sem escopo), mantém habilitado mesmo assim
      }
    }
    return NextResponse.json({ ok: true, enabled, baselined });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
