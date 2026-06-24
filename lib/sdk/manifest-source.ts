import { githubFetchRaw } from "@/lib/integrations/github-token";
import type { SdkManifest } from "./types";

export const SDK_REPO_OWNER = "alphametricshq";
export const SDK_REPO_NAME = "sdk-devs";

let cache: { manifest: SdkManifest; at: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5min — manifest muda pouco

/**
 * Busca o manifest.json do repo alphametricshq/sdk-devs.
 * Usa cache curto (5min) pra não bater na API do GitHub a cada refresh da
 * tela /sdk. Pra forçar fresh, passa { force: true }.
 */
export async function getManifest(opts?: { force?: boolean }): Promise<SdkManifest> {
  if (!opts?.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.manifest;
  }
  const raw = await githubFetchRaw(SDK_REPO_OWNER, SDK_REPO_NAME, "manifest.json");
  let parsed: SdkManifest;
  try {
    parsed = JSON.parse(raw) as SdkManifest;
  } catch (e) {
    throw new Error(`manifest.json invalido: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!Array.isArray(parsed.components)) {
    throw new Error("manifest.json sem array de components");
  }
  cache = { manifest: parsed, at: Date.now() };
  return parsed;
}
