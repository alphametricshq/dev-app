"use client";

export type SoundEvent = "complete" | "break" | "levelUp" | "goal";
export type SoundPresetId = "classic" | "eightBit" | "soft" | "bell" | "off" | "custom";

export type SoundEventConfig = {
  preset: SoundPresetId;
  customDataUrl?: string; // base64 data URL (audio/*)
  customName?: string;
};

export type SoundConfig = {
  volume: number; // 0..1
  events: Record<SoundEvent, SoundEventConfig>;
};

const STORAGE_KEY = "sounds-config-v1";

export const DEFAULT_CONFIG: SoundConfig = {
  volume: 0.6,
  events: {
    complete: { preset: "classic" },
    break: { preset: "classic" },
    levelUp: { preset: "classic" },
    goal: { preset: "classic" },
  },
};

export const EVENT_LABELS: Record<SoundEvent, string> = {
  complete: "Pomodoro completo",
  break: "Pausa concluída",
  levelUp: "Level up",
  goal: "Meta batida",
};

export const PRESET_LABELS: Record<SoundPresetId, string> = {
  classic: "Clássico",
  eightBit: "8-bit",
  soft: "Suave",
  bell: "Sino",
  off: "Mudo",
  custom: "Personalizado",
};

export function getSoundConfig(): SoundConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SoundConfig>;
    return {
      volume: typeof parsed.volume === "number" ? clamp01(parsed.volume) : DEFAULT_CONFIG.volume,
      events: {
        complete: parsed.events?.complete ?? DEFAULT_CONFIG.events.complete,
        break: parsed.events?.break ?? DEFAULT_CONFIG.events.break,
        levelUp: parsed.events?.levelUp ?? DEFAULT_CONFIG.events.levelUp,
        goal: parsed.events?.goal ?? DEFAULT_CONFIG.events.goal,
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function setSoundConfig(cfg: SoundConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn("[sounds] falha ao salvar config (storage cheio?):", e);
  }
}

export function updateSoundEvent(event: SoundEvent, patch: Partial<SoundEventConfig>): SoundConfig {
  const cfg = getSoundConfig();
  cfg.events[event] = { ...cfg.events[event], ...patch };
  setSoundConfig(cfg);
  return cfg;
}

export function updateSoundVolume(volume: number): SoundConfig {
  const cfg = getSoundConfig();
  cfg.volume = clamp01(volume);
  setSoundConfig(cfg);
  return cfg;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
