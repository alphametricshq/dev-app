import { NextResponse } from "next/server";
import {
  loadCredentials,
  saveCredentials,
  CREDENTIAL_KEYS,
  type Credentials,
} from "@/lib/credentials/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CredView = {
  set: boolean;
  preview: string | null;
  source: "env" | "file" | "none";
};

function maskedView() {
  const stored = loadCredentials();
  const view = {} as Record<keyof Credentials, CredView>;

  for (const key of CREDENTIAL_KEYS) {
    const fromEnv = process.env[key];
    const fromFile = stored[key];
    const v = fromEnv ?? fromFile;
    const source: "env" | "file" | "none" = fromEnv ? "env" : fromFile ? "file" : "none";

    if (!v) {
      view[key] = { set: false, preview: null, source };
      continue;
    }
    if (key === "GITHUB_USERNAME" || key === "SYNC_INTERVAL_MIN") {
      view[key] = { set: true, preview: String(v), source };
    } else {
      const s = String(v);
      view[key] = {
        set: true,
        preview: s.length > 8 ? `${s.slice(0, 4)}••••${s.slice(-3)}` : "••••",
        source,
      };
    }
  }
  return view;
}

export async function GET() {
  return NextResponse.json({ ok: true, credentials: maskedView() });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Credentials>;
    const current = loadCredentials();
    const next: Credentials = { ...current };
    for (const key of CREDENTIAL_KEYS) {
      const v = body[key];
      if (v === undefined) continue;
      if (typeof v !== "string") continue;
      if (v.trim() === "") {
        delete next[key];
      } else {
        next[key] = v.trim();
      }
    }
    saveCredentials(next);
    return NextResponse.json({ ok: true, credentials: maskedView() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
