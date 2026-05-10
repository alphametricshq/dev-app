// Sons sinteticos via Web Audio API. Sem arquivos externos.
// Toggle global em localStorage. Default: opt-in (off).

"use client";

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

function playTone({ freq, duration = 0.2, type = "sine", volume = 0.12, delay = 0 }: ToneOpts) {
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  // Envelope ADSR simples
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playSequence(notes: ToneOpts[]) {
  if (!isSoundsEnabled()) return;
  for (const n of notes) playTone(n);
}

// ===== Presets =====

export function playComplete() {
  // Acorde ascendente C5 -> E5 -> G5 (alegre)
  playSequence([
    { freq: 523, duration: 0.18, volume: 0.1 },
    { freq: 659, duration: 0.18, volume: 0.1, delay: 0.08 },
    { freq: 784, duration: 0.35, volume: 0.12, delay: 0.16 },
  ]);
}

export function playBreak() {
  // Curto e relaxante: G5 -> E5
  playSequence([
    { freq: 784, duration: 0.18, volume: 0.08 },
    { freq: 659, duration: 0.3, volume: 0.08, delay: 0.12 },
  ]);
}

export function playLevelUp() {
  // Sequência grandiosa (arpeggio C major + nota alta)
  playSequence([
    { freq: 523, duration: 0.12, volume: 0.1 },
    { freq: 659, duration: 0.12, volume: 0.1, delay: 0.08 },
    { freq: 784, duration: 0.12, volume: 0.1, delay: 0.16 },
    { freq: 1047, duration: 0.45, volume: 0.14, delay: 0.24, type: "triangle" },
  ]);
}

export function playGoal() {
  // Acorde celebrativo (mais brilhante)
  playSequence([
    { freq: 659, duration: 0.18, volume: 0.1, type: "triangle" },
    { freq: 880, duration: 0.18, volume: 0.1, type: "triangle", delay: 0.08 },
    { freq: 1047, duration: 0.4, volume: 0.12, type: "triangle", delay: 0.16 },
  ]);
}

export function playTick() {
  // Clique sutil
  playSequence([{ freq: 880, duration: 0.05, volume: 0.05, type: "square" }]);
}
