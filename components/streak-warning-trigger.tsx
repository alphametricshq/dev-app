"use client";

import { useEffect } from "react";
import { toast } from "@/lib/toast";
import { notifyStreakWarning } from "@/lib/desktop-notifications";
import {
  isStreakWarningEnabled,
  getStreakWarningHour,
  getLastWarnedIso,
  markWarnedToday,
} from "@/lib/streak-warning-config";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15min

async function check() {
  if (!isStreakWarningEnabled()) return;
  const now = new Date();
  if (now.getHours() < getStreakWarningHour()) return;
  const todayIso = now.toISOString().slice(0, 10);
  if (getLastWarnedIso() === todayIso) return;

  try {
    const res = await fetch("/api/streak-warning");
    const data = await res.json();
    if (!data?.ok || !data.shouldWarn) return;
    const streak = Number(data.currentStreak ?? 0);
    if (streak < 1) return;
    notifyStreakWarning(streak);
    toast.warning(
      `Streak de ${streak} dia${streak === 1 ? "" : "s"} em risco 🔥`,
      "Faz pelo menos um commit hoje pra não perder.",
      8000,
    );
    markWarnedToday();
  } catch {
    // ignora silencioso — pode ser falta de credencial GH
  }
}

export function StreakWarningTrigger() {
  useEffect(() => {
    // Check inicial após 5s (deixa o app boot tranquilo)
    const t = setTimeout(check, 5000);
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);
  return null;
}
