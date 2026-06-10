import { NextResponse } from "next/server";
import { getLastSyncs } from "@/lib/db/queries";
import { getCredential } from "@/lib/credentials/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const syncs = await getLastSyncs();
    const configured =
      !!getCredential("GITHUB_TOKEN") || !!getCredential("TRELLO_API_KEY");

    // Última sync mais recente (getLastSyncs já vem ordenado por started_at DESC)
    const latest = syncs[0] ?? null;
    const lastSync = latest ? (latest.finished_at ?? latest.started_at) : null;

    // Se qualquer fonte falhou na última rodada, o status geral é erro
    let lastStatus: "success" | "error" | null = null;
    if (syncs.some((s) => s.status === "error")) lastStatus = "error";
    else if (syncs.some((s) => s.status === "success")) lastStatus = "success";

    return NextResponse.json({ ok: true, configured, lastSync, lastStatus });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
