// O auto-sync agora roda no main process Electron via setInterval, batendo
// no endpoint /api/internal/run-sync. Ver electron/main.ts + lib/auto-sync.ts.
// Em modo dev (sem Electron), o sync nao roda automaticamente — disparar manual
// via botao "Sincronizar agora" no /settings.
export async function register() {
  // Intencionalmente vazio.
}
