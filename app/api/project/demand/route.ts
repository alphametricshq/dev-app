import { NextResponse } from "next/server";
import { createProjectDraft, moveProjectItem } from "@/lib/integrations/github-project";
import { ProjectAuthError } from "@/lib/integrations/github-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FieldInput = { fieldId: string; optionId: string };

function validFields(raw: unknown): FieldInput[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > 5) return null;
  const fields: FieldInput[] = [];
  for (const f of raw) {
    if (
      typeof f?.fieldId !== "string" ||
      typeof f?.optionId !== "string" ||
      !f.fieldId ||
      !f.optionId
    ) {
      return null;
    }
    fields.push({ fieldId: f.fieldId, optionId: f.optionId });
  }
  return fields;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, title, description } = body ?? {};
    const fields = validFields(body?.fields);
    if (typeof projectId !== "string" || !projectId || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { ok: false, error: "projectId e title são obrigatórios" },
        { status: 400 },
      );
    }
    if (!fields) {
      return NextResponse.json(
        { ok: false, error: "fields deve ser uma lista de { fieldId, optionId }" },
        { status: 400 },
      );
    }

    const itemId = await createProjectDraft({
      projectId,
      title: title.trim(),
      body: typeof description === "string" ? description.trim() : undefined,
    });
    // Seta os campos um a um (a API do Projects não tem batch); se um falhar,
    // o draft já existe — devolve o erro mas informa o itemId criado.
    try {
      for (const f of fields) {
        await moveProjectItem({ projectId, itemId, fieldId: f.fieldId, optionId: f.optionId });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao preencher campos";
      return NextResponse.json(
        { ok: false, error: `Demanda criada, mas falhou ao preencher campos: ${msg}`, itemId },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, itemId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = e instanceof ProjectAuthError ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
