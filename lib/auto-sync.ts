import { syncGithub } from "@/lib/integrations/github";
import { maybeRunAutoBackup } from "@/lib/backup";
import { logSyncStart, logSyncFinish } from "@/lib/db/queries";
import { getCredential } from "@/lib/credentials/store";

const DEFAULT_INTERVAL_MIN = 10;

async function runSync(source: "github", fn: () => Promise<{ itemsSynced: number }>) {
  const id = await logSyncStart(source);
  try {
    const r = await fn();
    await logSyncFinish(id, "success", r.itemsSynced, "auto");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await logSyncFinish(id, "error", 0, msg);
  }
}

/**
 * Roda um tick de sincronizacao: pulla GitHub (se token configurado) +
 * checa auto-backup. Chamada pelo endpoint interno /api/internal/run-sync
 * disparado pelo setInterval do main process Electron.
 *
 * Por que main process e nao instrumentation.ts (server Next):
 * o servidor Next dentro do Electron eh standalone e pode pausar timers
 * de modulos lazy-loaded quando a janela vai pra tray (sem trafego HTTP).
 * O main process Electron permanece vivo enquanto o tray icon existe.
 */
export async function runSyncTick(): Promise<{ ranGithub: boolean; ranBackup: boolean; backupFile?: string }> {
  const ghReady = !!getCredential("GITHUB_TOKEN") && !!getCredential("GITHUB_USERNAME");
  if (ghReady) {
    await runSync("github", () => syncGithub().then((r) => ({ itemsSynced: r.itemsSynced })));
  }

  let backupFile: string | undefined;
  try {
    const r = await maybeRunAutoBackup();
    if (r.ran) {
      backupFile = r.file;
      console.log(`[auto-backup] criado: ${r.file}`);
    }
  } catch (e) {
    console.warn("[auto-backup] falhou:", e);
  }

  return { ranGithub: ghReady, ranBackup: !!backupFile, backupFile };
}

export function getAutoSyncIntervalMinutes(): number {
  return Math.max(1, Number(getCredential("SYNC_INTERVAL_MIN")) || DEFAULT_INTERVAL_MIN);
}
