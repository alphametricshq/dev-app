"use client";

import { useEffect } from "react";
import { celebrate, dailyKey, weeklyKey, monthlyKey, levelKey } from "@/lib/celebrations";
import type { GoalProgress } from "@/lib/gamification/goals";

export function GoalCelebration({
  goals,
  level,
}: {
  goals: GoalProgress[];
  level: number;
}) {
  useEffect(() => {
    // Verifica metas
    for (const g of goals) {
      if (!g.completed) continue;
      let key: string;
      let title: string;
      if (g.period === "daily") {
        key = dailyKey();
        title = "Meta diária batida! 🎯";
      } else if (g.period === "weekly") {
        key = weeklyKey();
        title = "Meta semanal batida! 🚀";
      } else {
        key = monthlyKey();
        title = "Meta mensal batida! 🏆";
      }
      celebrate({ title, description: "Mandou bem demais.", key });
    }
  }, [goals]);

  useEffect(() => {
    // Level up: celebra cada nivel novo (uma vez por nivel)
    celebrate({
      title: `Nível ${level} alcançado! ✨`,
      description: "Continue assim e vamos pro próximo.",
      key: levelKey(level),
    });
  }, [level]);

  return null;
}
