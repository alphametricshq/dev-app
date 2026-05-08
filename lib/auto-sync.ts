import { syncGithub } from "@/lib/integrations/github";
import { syncTrello } from "@/lib/integrations/trello";
import { logSyncStart, logSyncFinish } from "@/lib/db/queries";
import { getCredential } from "@/lib/credentials/store";

const GLOBAL_KEY = Symbol.for("dashboard.autoSync.started");
type GlobalWithFlag = typeof globalThis & { [k: symbol]: boolean | undefined };
const g = globalThis as GlobalWithFlag;

const DEFAULT_INTERVAL_MIN = 30;

async function runSync(source: "github" | "trello", fn: () => Promise<{ itemsSynced: number }>) {
  const id = await logSyncStart(source);
  try {
    const r = await fn();
    await logSyncFinish(id, "success", r.itemsSynced, "auto");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await logSyncFinish(id, "error", 0, msg);
  }
}

async function tick() {
  const ghReady = !!getCredential("GITHUB_TOKEN") && !!getCredential("GITHUB_USERNAME");
  const trReady = !!getCredential("TRELLO_API_KEY") && !!getCredential("TRELLO_TOKEN");
  if (ghReady) await runSync("github", () => syncGithub().then((r) => ({ itemsSynced: r.itemsSynced })));
  if (trReady) await runSync("trello", () => syncTrello(90).then((r) => ({ itemsSynced: r.itemsSynced })));
}

export function startAutoSync() {
  if (g[GLOBAL_KEY]) return;
  g[GLOBAL_KEY] = true;

  const minutes = Math.max(1, Number(getCredential("SYNC_INTERVAL_MIN")) || DEFAULT_INTERVAL_MIN);
  const intervalMs = minutes * 60 * 1000;

  // Primeiro tick após 10s (deixa o servidor estabilizar) e depois no intervalo configurado
  setTimeout(() => {
    tick().catch(() => {});
    setInterval(() => {
      tick().catch(() => {});
    }, intervalMs);
  }, 10_000);

  console.log(`[auto-sync] iniciado · intervalo: ${minutes}min`);
}

export function getAutoSyncIntervalMinutes(): number {
  return Math.max(1, Number(getCredential("SYNC_INTERVAL_MIN")) || DEFAULT_INTERVAL_MIN);
}
