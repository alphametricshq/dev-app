// Sons sintéticos via Web Audio API + suporte a arquivos customizados.
// Toggle global + presets/volume/custom files vivem em localStorage.

"use client";

import {
  getSoundConfig,
  type SoundEvent,
  type SoundPresetId,
} from "./sounds-config";

const STORAGE_KEY = "sounds-enabled";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function isSoundsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function setSoundsEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}

type ToneOpts = {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
};

function playTone(opts: ToneOpts, volumeMult: number) {
  const { freq, duration = 0.2, type = "sine", volume = 0.12, delay = 0 } = opts;
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  const effectiveVol = Math.max(0.0001, volume * volumeMult);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(effectiveVol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playSequence(notes: ToneOpts[], volumeMult: number) {
  for (const n of notes) playTone(n, volumeMult);
}

// ============== Presets sintéticos ==============

type PresetMap = Record<SoundEvent, ToneOpts[]>;

const CLASSIC: PresetMap = {
  complete: [
    { freq: 523, duration: 0.18, volume: 0.1 },
    { freq: 659, duration: 0.18, volume: 0.1, delay: 0.08 },
    { freq: 784, duration: 0.35, volume: 0.12, delay: 0.16 },
  ],
  break: [
    { freq: 784, duration: 0.18, volume: 0.08 },
    { freq: 659, duration: 0.3, volume: 0.08, delay: 0.12 },
  ],
  levelUp: [
    { freq: 523, duration: 0.12, volume: 0.1 },
    { freq: 659, duration: 0.12, volume: 0.1, delay: 0.08 },
    { freq: 784, duration: 0.12, volume: 0.1, delay: 0.16 },
    { freq: 1047, duration: 0.45, volume: 0.14, delay: 0.24, type: "triangle" },
  ],
  goal: [
    { freq: 659, duration: 0.18, volume: 0.1, type: "triangle" },
    { freq: 880, duration: 0.18, volume: 0.1, type: "triangle", delay: 0.08 },
    { freq: 1047, duration: 0.4, volume: 0.12, type: "triangle", delay: 0.16 },
  ],
};

const EIGHT_BIT: PresetMap = {
  complete: [
    { freq: 880, duration: 0.08, volume: 0.08, type: "square" },
    { freq: 1175, duration: 0.08, volume: 0.08, type: "square", delay: 0.07 },
    { freq: 1568, duration: 0.18, volume: 0.1, type: "square", delay: 0.14 },
  ],
  break: [
    { freq: 880, duration: 0.08, volume: 0.07, type: "square" },
    { freq: 587, duration: 0.18, volume: 0.07, type: "square", delay: 0.07 },
  ],
  levelUp: [
    { freq: 523, duration: 0.06, volume: 0.08, type: "square" },
    { freq: 698, duration: 0.06, volume: 0.08, type: "square", delay: 0.05 },
    { freq: 880, duration: 0.06, volume: 0.08, type: "square", delay: 0.1 },
    { freq: 1047, duration: 0.06, volume: 0.08, type: "square", delay: 0.15 },
    { freq: 1397, duration: 0.25, volume: 0.12, type: "square", delay: 0.2 },
  ],
  goal: [
    { freq: 1047, duration: 0.07, volume: 0.1, type: "square" },
    { freq: 1568, duration: 0.07, volume: 0.1, type: "square", delay: 0.06 },
    { freq: 2093, duration: 0.18, volume: 0.12, type: "square", delay: 0.12 },
  ],
};

const SOFT: PresetMap = {
  complete: [
    { freq: 440, duration: 0.5, volume: 0.07, type: "sine" },
    { freq: 554, duration: 0.7, volume: 0.07, type: "sine", delay: 0.15 },
  ],
  break: [
    { freq: 440, duration: 0.5, volume: 0.06, type: "sine" },
    { freq: 370, duration: 0.7, volume: 0.06, type: "sine", delay: 0.15 },
  ],
  levelUp: [
    { freq: 392, duration: 0.4, volume: 0.07, type: "sine" },
    { freq: 523, duration: 0.4, volume: 0.07, type: "sine", delay: 0.18 },
    { freq: 659, duration: 0.8, volume: 0.09, type: "sine", delay: 0.36 },
  ],
  goal: [
    { freq: 523, duration: 0.35, volume: 0.07, type: "sine" },
    { freq: 659, duration: 0.35, volume: 0.07, type: "sine", delay: 0.15 },
    { freq: 784, duration: 0.6, volume: 0.09, type: "sine", delay: 0.3 },
  ],
};

const BELL: PresetMap = {
  complete: [
    { freq: 880, duration: 1.0, volume: 0.12, type: "sine" },
    { freq: 1760, duration: 1.0, volume: 0.04, type: "sine" },
  ],
  break: [
    { freq: 587, duration: 0.8, volume: 0.1, type: "sine" },
    { freq: 1175, duration: 0.8, volume: 0.03, type: "sine" },
  ],
  levelUp: [
    { freq: 880, duration: 0.8, volume: 0.1, type: "sine" },
    { freq: 1175, duration: 0.8, volume: 0.1, type: "sine", delay: 0.25 },
    { freq: 1760, duration: 1.2, volume: 0.12, type: "sine", delay: 0.5 },
  ],
  goal: [
    { freq: 880, duration: 0.6, volume: 0.1, type: "sine" },
    { freq: 1175, duration: 0.6, volume: 0.1, type: "sine", delay: 0.18 },
    { freq: 1760, duration: 1.0, volume: 0.12, type: "sine", delay: 0.36 },
  ],
};

const PRESETS: Record<Exclude<SoundPresetId, "off" | "custom">, PresetMap> = {
  classic: CLASSIC,
  eightBit: EIGHT_BIT,
  soft: SOFT,
  bell: BELL,
};

// ============== Tocar custom (data URL) ==============

let customAudio: HTMLAudioElement | null = null;

function playDataUrl(dataUrl: string, volumeMult: number) {
  if (typeof window === "undefined") return;
  try {
    if (customAudio) {
      customAudio.pause();
      customAudio = null;
    }
    customAudio = new Audio(dataUrl);
    customAudio.volume = Math.max(0, Math.min(1, volumeMult));
    customAudio.play().catch((e) => console.warn("[sounds] custom play falhou:", e));
  } catch (e) {
    console.warn("[sounds] custom error:", e);
  }
}

// ============== Dispatch principal ==============

function playEvent(event: SoundEvent) {
  if (!isSoundsEnabled()) return;
  const cfg = getSoundConfig();
  const eventCfg = cfg.events[event];
  const vol = cfg.volume;

  if (eventCfg.preset === "off") return;
  if (eventCfg.preset === "custom" && eventCfg.customDataUrl) {
    playDataUrl(eventCfg.customDataUrl, vol);
    return;
  }
  const presetKey = (eventCfg.preset === "custom" ? "classic" : eventCfg.preset) as Exclude<SoundPresetId, "off" | "custom">;
  const preset = PRESETS[presetKey] ?? CLASSIC;
  playSequence(preset[event], vol);
}

export function playComplete() { playEvent("complete"); }
export function playBreak() { playEvent("break"); }
export function playLevelUp() { playEvent("levelUp"); }
export function playGoal() { playEvent("goal"); }

export function previewSound(preset: SoundPresetId, event: SoundEvent, customDataUrl?: string) {
  const cfg = getSoundConfig();
  const vol = cfg.volume;
  if (preset === "off") return;
  if (preset === "custom") {
    if (customDataUrl) playDataUrl(customDataUrl, vol);
    return;
  }
  const map = PRESETS[preset];
  if (!map) return;
  playSequence(map[event], vol);
}
