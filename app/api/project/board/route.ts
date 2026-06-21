import { NextResponse } from "next/server";
import { fetchProjectItems, fetchProjectMeta } from "@/lib/integrations/github-project";
import { getProjectConfig } from "@/lib/integrations/github-project-config";
import { ProjectAuthError } from "@/lib/integrations/github-token";
import { getCredential } from "@/lib/credentials/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfg = await getProjectConfig();
    const [meta, items] = await Promise.all([
      fetchProjectMeta(cfg.org, cfg.projectNumber),
      fetchProjectItems(cfg.org, cfg.projectNumber),
    ]);
    const myLogin = getCredential("GITHUB_USERNAME") ?? null;
    return NextResponse.json({
      ok: true,
      meta,
      items,
      myLogin,
      org: cfg.org,
      projectNumber: cfg.projectNumber,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = e instanceof ProjectAuthError ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg, authError: status === 403 }, { status });
  }
}
