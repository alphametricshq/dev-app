// Themes baseados em CSS vars (--accent, --accent-hover, --accent-subtle)

export type ThemeId = "purple" | "blue" | "green" | "pink" | "cyan" | "orange";

export type Theme = {
  id: ThemeId;
  label: string;
  preview: string; // hex pra swatch
  vars: {
    accent: string; // formato "H S% L%"
    accentHover: string;
    accentSubtle: string;
  };
};

export const THEMES: Record<ThemeId, Theme> = {
  purple: {
    id: "purple",
    label: "Roxo",
    preview: "#a070ff",
    vars: { accent: "265 85% 65%", accentHover: "265 85% 70%", accentSubtle: "265 50% 25%" },
  },
  blue: {
    id: "blue",
    label: "Azul",
    preview: "#3aaaff",
    vars: { accent: "200 90% 60%", accentHover: "200 90% 65%", accentSubtle: "200 60% 25%" },
  },
  green: {
    id: "green",
    label: "Verde",
    preview: "#3ddc84",
    vars: { accent: "150 70% 50%", accentHover: "150 70% 55%", accentSubtle: "150 50% 22%" },
  },
  pink: {
    id: "pink",
    label: "Rosa",
    preview: "#ff5c9c",
    vars: { accent: "330 85% 65%", accentHover: "330 85% 70%", accentSubtle: "330 50% 25%" },
  },
  cyan: {
    id: "cyan",
    label: "Ciano",
    preview: "#3edcd0",
    vars: { accent: "175 75% 55%", accentHover: "175 75% 60%", accentSubtle: "175 55% 22%" },
  },
  orange: {
    id: "orange",
    label: "Laranja",
    preview: "#ff8a3a",
    vars: { accent: "22 90% 60%", accentHover: "22 90% 65%", accentSubtle: "22 60% 25%" },
  },
};

export const DEFAULT_THEME: ThemeId = "purple";
const STORAGE_KEY = "theme-id";

export function applyTheme(id: ThemeId) {
  const t = THEMES[id] ?? THEMES[DEFAULT_THEME];
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent", t.vars.accent);
  root.style.setProperty("--accent-hover", t.vars.accentHover);
  root.style.setProperty("--accent-subtle", t.vars.accentSubtle);
}

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const id = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
  if (id && id in THEMES) return id;
  return DEFAULT_THEME;
}

export function setStoredTheme(id: ThemeId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
  applyTheme(id);
}

// ===== Dark / light mode =====

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
