"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Play, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isDesktopNotificationsEnabled,
  setDesktopNotificationsEnabled,
  ensurePermission,
  showDesktopNotification,
} from "@/lib/desktop-notifications";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function readPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

export function DesktopNotificationsToggle() {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("default");

  useEffect(() => {
    setMounted(true);
    setEnabled(isDesktopNotificationsEnabled());
    setPermission(readPermission());
  }, []);

  async function toggle() {
    const next = !enabled;
    if (next && permission !== "granted") {
      const ok = await ensurePermission();
      setPermission(readPermission());
      if (!ok) return;
    }
    setEnabled(next);
    setDesktopNotificationsEnabled(next);
  }

  function preview() {
    showDesktopNotification({
      title: "Teste de notificação 🎯",
      body: "Você verá assim quando bater uma meta ou subir de nível.",
      tag: "preview",
    });
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          {enabled && mounted ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Notificações desktop</h2>
          <p className="text-xs text-fg-muted">
            Avisos nativos do Windows quando bate meta, sobe nível ou pomodoro termina
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={!mounted || permission === "unsupported"}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            enabled ? "bg-accent" : "bg-bg-hover",
          )}
          aria-label={enabled ? "Desligar" : "Ligar"}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </header>

      {mounted && permission === "denied" && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Permissão de notificações negada no sistema. Pra liberar, vai em Configurações do
            Windows → Notificações → Alphametrics Dev App.
          </span>
        </div>
      )}

      {mounted && permission === "unsupported" && (
        <p className="text-[11px] text-fg-subtle">
          Seu sistema não suporta notificações nativas.
        </p>
      )}

      {mounted && enabled && permission === "granted" && (
        <button onClick={preview} className="btn-secondary py-1.5 text-xs">
          <Play className="h-3 w-3" />
          Testar
        </button>
      )}
    </div>
  );
}
