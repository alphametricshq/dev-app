"use client";

export type ShortcutId = "globalQuickCapture" | "globalQuickTask" | "globalPomodoroToggle";

export type ShortcutsConfig = Record<ShortcutId, string>;

const STORAGE_KEY = "keyboard-shortcuts-v1";

export const DEFAULT_SHORTCUTS: ShortcutsConfig = {
  globalQuickCapture: "CommandOrControl+Shift+J",
  globalQuickTask: "CommandOrControl+Shift+T",
  globalPomodoroToggle: "CommandOrControl+Shift+Space",
};

export const SHORTCUT_LABELS: Record<ShortcutId, string> = {
  globalQuickCapture: "Quick capture (Journal)",
  globalQuickTask: "Quick task (Trello)",
  globalPomodoroToggle: "Play/pause do pomodoro ativo",
};

export function getShortcutsConfig(): ShortcutsConfig {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(raw) as Partial<ShortcutsConfig>;
    return {
      globalQuickCapture: parsed.globalQuickCapture ?? DEFAULT_SHORTCUTS.globalQuickCapture,
      globalQuickTask: parsed.globalQuickTask ?? DEFAULT_SHORTCUTS.globalQuickTask,
      globalPomodoroToggle: parsed.globalPomodoroToggle ?? DEFAULT_SHORTCUTS.globalPomodoroToggle,
    };
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export function setShortcutsConfig(cfg: ShortcutsConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// Converte KeyboardEvent → string Electron-compatible
export function accelFromEvent(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("CommandOrControl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  // Ignora se pressionou só modifier
  const key = e.key;
  if (key === "Control" || key === "Meta" || key === "Shift" || key === "Alt") return null;
  // Normaliza letras
  let normalized = key.length === 1 ? key.toUpperCase() : key;
  // Mapeia algumas keys especiais
  const map: Record<string, string> = {
    " ": "Space",
    Escape: "Escape",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
  };
  if (map[normalized]) normalized = map[normalized];
  parts.push(normalized);
  return parts.join("+");
}

// Formato bonito pra exibir (Ctrl+Shift+J em vez de CommandOrControl+Shift+J)
export function prettyAccel(accel: string): string {
  return accel.replace(/CommandOrControl/g, "Ctrl");
}

// Valida: precisa ter pelo menos 1 modifier + 1 tecla
export function isValidAccel(accel: string): boolean {
  if (!accel) return false;
  const parts = accel.split("+");
  if (parts.length < 2) return false;
  const modifiers = ["CommandOrControl", "Ctrl", "Cmd", "Meta", "Alt", "Shift"];
  const hasModifier = parts.some((p) => modifiers.includes(p));
  return hasModifier;
}
