// Lock simples por chave pra impedir syncs concorrentes (ex: auto-sync + botão
// manual disparando ao mesmo tempo).
// Usa globalThis pra sobreviver a múltiplas instâncias do módulo em dev.

const LOCKS_KEY = Symbol.for("dashboard.syncLocks");

type GlobalWithLocks = typeof globalThis & {
  [LOCKS_KEY]?: Set<string>;
};

function locks(): Set<string> {
  const g = globalThis as GlobalWithLocks;
  if (!g[LOCKS_KEY]) g[LOCKS_KEY] = new Set();
  return g[LOCKS_KEY];
}

/**
 * Executa fn segurando o lock da chave. Se o lock já estiver em uso,
 * retorna `busyResult` sem executar.
 */
export async function withSyncLock<T>(key: string, busyResult: T, fn: () => Promise<T>): Promise<T> {
  const l = locks();
  if (l.has(key)) return busyResult;
  l.add(key);
  try {
    return await fn();
  } finally {
    l.delete(key);
  }
}
