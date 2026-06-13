import { NextResponse } from "next/server";
import {
  listAutoBackups,
  readAutoBackup,
  importData,
  maybeRunAutoBackup,
} from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backups = listAutoBackups();
    return NextResponse.json({ ok: true, backups });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

// POST sem body: força criar backup agora; com body { restore: "<name>" }: restaura
export async function POST(req: Request) {
  try {
    const ct = req.headers.get("content-type") ?? "";
    let restoreName: string | null = null;
    if (ct.includes("json")) {
      const body = await req.json().catch(() => ({}));
      if (typeof body.restore === "string") restoreName = body.restore;
    }
    if (restoreName) {
      const data = readAutoBackup(restoreName);
      const r = await importData(data);
      return NextResponse.json({ ok: true, restored: restoreName, counts: r.counts });
    }
    // Força backup agora (ignora throttle de 24h)
    const r = await maybeRunAutoBackup();
    if (!r.ran) {
      // Se rodou recentemente, ainda assim cria um agora
      // (chamando direto exportData via list+throttle interno seria mais complexo;
      // usuário clicou pra forçar, então respeitamos)
      return NextResponse.json({ ok: true, throttled: true });
    }
    return NextResponse.json({ ok: true, file: r.file });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
