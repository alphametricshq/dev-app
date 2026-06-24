import { NextResponse } from "next/server";
import { getManifest } from "@/lib/sdk/manifest-source";
import { detectAll } from "@/lib/sdk/detect";
import type { SdkState } from "@/lib/sdk/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manifest = await getManifest();
    const components = await detectAll(manifest.components);
    const state: SdkState = {
      manifest,
      components,
      scannedAt: new Date().toISOString(),
    };
    return NextResponse.json({ ok: true, state });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
