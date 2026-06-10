"use client";

import { localIsoDate } from "@/lib/local-date";

const ENABLED_KEY = "streak-warning-enabled";
const HOUR_KEY = "streak-warning-hour";
const LAST_WARNED_KEY = "streak-warning-last";

export const DEFAULT_HOUR = 20;

export function isStreakWarningEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Default ON
  return localStorage.getItem(ENABLED_KEY) !== "0";
}

export function setStreakWarningEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
}

export function getStreakWarningHour(): number {
  if (typeof window === "undefined") return DEFAULT_HOUR;
  const v = localStorage.getItem(HOUR_KEY);
  if (!v) return DEFAULT_HOUR;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0 || n > 23) return DEFAULT_HOUR;
  return n;
}

export function setStreakWarningHour(h: number) {
  if (typeof window === "undefined") return;
  const clamped = Math.max(0, Math.min(23, Math.round(h)));
  localStorage.setItem(HOUR_KEY, String(clamped));
}

export function getLastWarnedIso(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_WARNED_KEY);
}

export function markWarnedToday() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_WARNED_KEY, localIsoDate());
}
