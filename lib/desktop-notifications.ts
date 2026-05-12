"use client";

const ENABLED_KEY = "desktop-notifications-enabled";

export function isDesktopNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Default ON pra usuários que aceitaram a permissão; OFF se rejeitada
  const stored = localStorage.getItem(ENABLED_KEY);
  if (stored === "0") return false;
  if (stored === "1") return true;
  return permissionGranted();
}

export function setDesktopNotificationsEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
}

export function permissionGranted(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "granted";
}

export async function ensurePermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

type NotifyOpts = {
  title: string;
  body?: string;
  icon?: string;
  silent?: boolean;
  tag?: string;
};

export function showDesktopNotification(opts: NotifyOpts) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (!isDesktopNotificationsEnabled()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(opts.title, {
      body: opts.body,
      icon: opts.icon,
      silent: opts.silent,
      tag: opts.tag,
    });
  } catch {
    // ignore
  }
}

// ===== Presets =====

export function notifyGoalCompleted(period: "daily" | "weekly" | "monthly") {
  const labels = {
    daily: "Meta diária batida! 🎯",
    weekly: "Meta semanal batida! 🚀",
    monthly: "Meta mensal batida! 🏆",
  };
  showDesktopNotification({
    title: labels[period],
    body: "Bora descansar um pouco merecido.",
    tag: `goal-${period}`,
  });
}

export function notifyLevelUp(level: number) {
  showDesktopNotification({
    title: `Level up! Nível ${level} ✨`,
    body: "Continua nesse ritmo.",
    tag: `level-${level}`,
  });
}

export function notifyStreakWarning(currentStreak: number) {
  showDesktopNotification({
    title: `Sua streak de ${currentStreak} dias tá em risco 🔥`,
    body: "Faz pelo menos uma contribuição hoje pra não perder.",
    tag: "streak-warning",
  });
}

export function notifyPomodoroComplete(durationMin: number, type: "focus" | "short_break" | "long_break") {
  const titles = {
    focus: "Pomodoro completo! ✅",
    short_break: "Pausa curta terminou",
    long_break: "Pausa longa terminou",
  };
  showDesktopNotification({
    title: titles[type],
    body: `${durationMin} minutos registrados.`,
    tag: "pomodoro",
  });
}
