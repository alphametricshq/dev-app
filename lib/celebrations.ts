"use client";

import { toast } from "@/lib/toast";

// Pub/sub pra burst de confete on-demand
let burstListeners: ((trigger: number) => void)[] = [];
let burstCounter = 0;

export function fireConfetti() {
  burstCounter++;
  for (const l of burstListeners) l(burstCounter);
}

export function subscribeConfetti(cb: (trigger: number) => void): () => void {
  burstListeners.push(cb);
  return () => {
    burstListeners = burstListeners.filter((l) => l !== cb);
  };
}

// ===== Tracker de celebrações já feitas =====

const STORAGE_KEY = "celebrations-v1";

type Celebrated = Record<string, true>;

function load(): Celebrated {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Celebrated) : {};
  } catch {
    return {};
  }
}

function save(value: Celebrated) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function hasCelebrated(key: string): boolean {
  return !!load()[key];
}

export function markCelebrated(key: string): void {
  const c = load();
  c[key] = true;
  save(c);
}

// ===== Helpers de chave =====

function isoDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function isoWeek(d = new Date()): string {
  const day = (d.getDay() + 6) % 7; // seg = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return isoDate(monday);
}

function isoMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function dailyKey(): string {
  return `daily:${isoDate()}`;
}
export function weeklyKey(): string {
  return `weekly:${isoWeek()}`;
}
export function monthlyKey(): string {
  return `monthly:${isoMonth()}`;
}
export function levelKey(level: number): string {
  return `level:${level}`;
}

// ===== Disparo pronto =====

export function celebrate(opts: { title: string; description?: string; key: string }) {
  if (hasCelebrated(opts.key)) return false;
  markCelebrated(opts.key);
  fireConfetti();
  toast.success(opts.title, opts.description, 6000);
  return true;
}
