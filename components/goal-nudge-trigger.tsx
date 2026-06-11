"use client";

import { useEffect } from "react";
import { toast } from "@/lib/toast";
import { localIsoDate } from "@/lib/local-date";
import { showDesktopNotification } from "@/lib/desktop-notifications";
import type { GoalProgress } from "@/lib/gamification/goals";

const STORAGE_KEY = "goal-nudge-shown-v1";
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

type Shown = Record<string, true>;

function loadShown(): Shown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Shown) : {};
  } catch {
    return {};
  }
}

function markShown(key: string) {
  try {
    const shown = loadShown();
    shown[key] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shown));
  } catch {
    // ignore
  }
}

async function check() {
  try {
    const res = await fetch("/api/goals/progress");
    const data = await res.json();
    if (!data?.ok) return;
    const daily = (data.goals as GoalProgress[]).find((g) => g.period === "daily");
    if (!daily || daily.completed) return;

    const today = localIsoDate();
    const shown = loadShown();

    // Trello: falta exatamente 1 task (e o dia já começou — current > 0)
    const trRemaining = daily.trello.target - daily.trello.current;
    if (daily.trello.current > 0 && trRemaining === 1 && !shown[`${today}:trello`]) {
      toast.info("Tá quase! 🔥", "Falta 1 task pra bater a meta de hoje no Trello.", 8000);
      showDesktopNotification({
        title: "Falta 1 task! 🔥",
        body: "Fecha mais uma no Trello e a meta de hoje tá batida.",
        tag: "goal-nudge-trello",
      });
      markShown(`${today}:trello`);
    }

    // GitHub: reta final — faltam <= 10% da meta (mín. 3) e já tem progresso
    const ghRemaining = daily.github.target - daily.github.current;
    const ghThreshold = Math.max(3, Math.round(daily.github.target * 0.1));
    if (
      daily.github.current > 0 &&
      ghRemaining > 0 &&
      ghRemaining <= ghThreshold &&
      !shown[`${today}:github`]
    ) {
      toast.info(
        "Reta final! 🚀",
        `Falta${ghRemaining === 1 ? "" : "m"} ${ghRemaining} contribuiç${ghRemaining === 1 ? "ão" : "ões"} pra meta de hoje.`,
        8000,
      );
      showDesktopNotification({
        title: `Falta${ghRemaining === 1 ? "" : "m"} ${ghRemaining} pra meta! 🚀`,
        body: "Mais um empurrãozinho no GitHub e fecha o dia.",
        tag: "goal-nudge-github",
      });
      markShown(`${today}:github`);
    }
  } catch {
    // silencioso
  }
}

export function GoalNudgeTrigger() {
  useEffect(() => {
    const t = setTimeout(check, 10_000);
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);
  return null;
}
