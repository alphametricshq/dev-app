// Identidade visual fixa Alphametrics (Verde Neon #C1FF25 como accent — definido
// no globals.css). Aqui só sobrou o controle de dark/light mode.

const MODE_STORAGE_KEY = "theme-mode";

export type ThemeMode = "dark" | "light";

export function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(MODE_STORAGE_KEY);
  return v === "light" ? "light" : "dark";
}

export function setStoredMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_STORAGE_KEY, mode);
  applyMode(mode);
}

export function applyMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(mode);
}
