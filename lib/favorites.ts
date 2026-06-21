// Favoritos de items do GH Project — pub/sub leve em cima de localStorage,
// pra todos os componentes (card no /demandas, tab "Favoritos", futuro widget
// na visão geral) reagirem ao mesmo estado.

const STORAGE_KEY = "favorite-project-items-v1";

type Listener = (ids: Set<string>) => void;

let cache: Set<string> | null = null;
const listeners = new Set<Listener>();

function load(): Set<string> {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = new Set();
    return cache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = new Set();
      return cache;
    }
    const parsed = JSON.parse(raw);
    cache = new Set(Array.isArray(parsed) ? parsed : []);
    return cache;
  } catch {
    cache = new Set();
    return cache;
  }
}

function persist() {
  if (typeof window === "undefined" || !cache) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cache)));
  } catch {
    // ignora
  }
}

function emit() {
  if (!cache) return;
  const snapshot = new Set(cache);
  listeners.forEach((l) => l(snapshot));
}

export function getFavorites(): Set<string> {
  return new Set(load());
}

export function isFavorite(id: string): boolean {
  return load().has(id);
}

export function toggleFavorite(id: string): boolean {
  const set = load();
  const nowFav = !set.has(id);
  if (nowFav) set.add(id);
  else set.delete(id);
  persist();
  emit();
  return nowFav;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Sincroniza entre abas/janelas do mesmo app (caso o user use overlay etc)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null;
    emit();
  });
}
