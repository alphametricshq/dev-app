"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ROUTE_KEYS } from "@/lib/shortcuts";
import { toggleHelp, closeHelp } from "@/lib/help-modal";
import { isPaletteOpen } from "@/lib/command-palette";
import { start as startPomodoro, configureSession } from "@/lib/pomodoro-store";
import { toast } from "@/lib/toast";

const PREFIX_TIMEOUT = 1500;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function ShortcutsProvider() {
  const router = useRouter();
  const prefixRef = useRef<string | null>(null);
  const prefixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearPrefix() {
      prefixRef.current = null;
      if (prefixTimerRef.current) {
        clearTimeout(prefixTimerRef.current);
        prefixTimerRef.current = null;
      }
    }

    function setPrefix(p: string) {
      prefixRef.current = p;
      if (prefixTimerRef.current) clearTimeout(prefixTimerRef.current);
      prefixTimerRef.current = setTimeout(clearPrefix, PREFIX_TIMEOUT);
    }

    async function syncAll() {
      try {
        const res = await fetch("/api/sync/all", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Sync falhou");
        toast.success("Sincronizado", data.message);
        setTimeout(() => location.reload(), 800);
      } catch (e) {
        toast.error("Falha no sync", e instanceof Error ? e.message : "Erro desconhecido");
      }
    }

    function onKey(e: KeyboardEvent) {
      // Não interferir com input/textarea
      if (isTypingTarget(e.target)) return;
      // Ignorar combinações com Ctrl/Cmd/Alt (Ctrl+K já é tratado em command-palette)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Não interferir quando palette aberto
      if (isPaletteOpen()) return;

      // Se tem prefix g pendente
      if (prefixRef.current === "g") {
        const key = e.key.toLowerCase();
        const route = ROUTE_KEYS[key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        clearPrefix();
        return;
      }

      // Tecla individual
      const key = e.key;

      if (key === "g") {
        e.preventDefault();
        setPrefix("g");
        return;
      }

      if (key === "?") {
        e.preventDefault();
        toggleHelp();
        return;
      }

      if (key === "Escape") {
        closeHelp();
        return;
      }

      if (key === "n") {
        e.preventDefault();
        router.push("/journal");
        return;
      }

      if (key === "p") {
        e.preventDefault();
        configureSession("focus", 25);
        startPomodoro({ type: "focus", durationMin: 25 });
        router.push("/foco");
        return;
      }

      if (key === "s") {
        e.preventDefault();
        syncAll();
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prefixTimerRef.current) clearTimeout(prefixTimerRef.current);
    };
  }, [router]);

  return null;
}
