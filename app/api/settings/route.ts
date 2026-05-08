import { NextResponse } from "next/server";
import {
  loadCredentials,
  saveCredentials,
  CREDENTIAL_KEYS,
  type Credentials,
} from "@/lib/credentials/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mascara o valor para o front: "ghp_xxx" -> "ghp_•••3xyz"
function maskedView(creds: Credentials) {
  const view: Record<string, { set: boolean; preview: string | null }> = {};
  for (const key of CREDENTIAL_KEYS) {
    const v = creds[key];
    if (!v) {
      view[key] = { set: false, preview: null };
    } else if (key === "GITHUB_USERNAME" || key === "TRELLO_DONE_LIST_IDS" || key === "SYNC_INTERVAL_MIN") {
      view[key] = { set: true, preview: String(v) };
    } else {
      const s = String(v);
      view[key] = {
        set: true,
        preview: s.length > 8 ? `${s.slice(0, 4)}••••${s.slice(-3)}` : "••••",
      };
    }
  }
  return view;
}

export async function GET() {
  const creds = loadCredentials();
  return NextResponse.json({ ok: true, credentials: maskedView(creds) });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Credentials>;
    const current = loadCredentials();
    const next: Credentials = { ...current };
    for (const key of CREDENTIAL_KEYS) {
      const v = body[key];
      if (v === undefined) continue; // nao mexer
      if (typeof v !== "string") continue;
      if (v.trim() === "") {
        delete next[key];
      } else {
        next[key] = v.trim();
      }
    }
    saveCredentials(next);
    return NextResponse.json({ ok: true, credentials: maskedView(next) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
