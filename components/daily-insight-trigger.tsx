"use client";

import { useEffect } from "react";
import { toast } from "@/lib/toast";
import { localIsoDate } from "@/lib/local-date";

const STORAGE_KEY = "daily-insight-shown";

function todayIso(): string {
  return localIsoDate();
}

export function DailyInsightTrigger() {
  useEffect(() => {
    const shown = localStorage.getItem(STORAGE_KEY);
    if (shown === todayIso()) return;

    // Pequeno delay pra não competir com outros toasts no boot
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/insights/daily");
        const data = await res.json();
        if (data?.ok && data.insight) {
          toast.info(data.insight.title, data.insight.description, 8000);
          localStorage.setItem(STORAGE_KEY, todayIso());
        }
      } catch {
        // ignora erro silencioso
      }
    }, 1500);

    return () => clearTimeout(handle);
  }, []);

  return null;
}
