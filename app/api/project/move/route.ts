import { NextResponse } from "next/server";
import { moveProjectItem } from "@/lib/integrations/github-project";
import { ProjectAuthError } from "@/lib/integrations/github-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, itemId, fieldId, optionId } = body ?? {};
    if (!projectId || !itemId || !fieldId || !optionId) {
      return NextResponse.json(
        { ok: false, error: "projectId, itemId, fieldId e optionId são obrigatórios" },
        { status: 400 },
      );
    }
    await moveProjectItem({ projectId, itemId, fieldId, optionId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = e instanceof ProjectAuthError ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
