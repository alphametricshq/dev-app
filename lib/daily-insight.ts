import { getGithubContributions, getTrelloCompletedByDay } from "@/lib/db/queries";
import { listHabitsWithStats } from "@/lib/db/habits-queries";
import { getPomodoroStats } from "@/lib/db/pomodoro-queries";
import { getGamificationSummary } from "@/lib/gamification";
import { getGithubAnalytics } from "@/lib/analytics/github";
import { getTrelloAnalytics } from "@/lib/analytics/trello";

export type DailyInsight = {
  title: string;
  description: string;
  emoji: string;
  weight: number;
};

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function computeDailyInsight(): Promise<DailyInsight | null> {
  const [contribs, tasks, gami, ghAnalytics, trAnalytics, habits, pomoStats] = await Promise.all([
    getGithubContributions(60),
    getTrelloCompletedByDay(60),
    getGamificationSummary(),
    getGithubAnalytics(),
    getTrelloAnalytics(),
    listHabitsWithStats(),
    getPomodoroStats(),
  ]);

  const today = new Date();
  const todayWeekday = today.getDay();
  const todayIso = isoDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yIso = isoDate(yesterday);

  const candidates: DailyInsight[] = [];

  // Hoje é o melhor dia da semana
  if (ghAnalytics.bestWeekday && ghAnalytics.bestWeekday.weekday === todayWeekday && ghAnalytics.bestWeekday.avg > 0) {
    candidates.push({
      title: `${WEEKDAYS[todayWeekday]} é seu melhor dia da semana 🎯`,
      description: `Em média você faz ${ghAnalytics.bestWeekday.avg.toFixed(1)} contribuições. Bora caprichar.`,
      emoji: "🎯",
      weight: 4,
    });
  }

  // Streak ativo
  if (gami.currentStreak >= 7) {
    candidates.push({
      title: `${gami.currentStreak} dias seguidos contribuindo 🔥`,
      description: "Mantém o ritmo, não deixa cair hoje.",
      emoji: "🔥",
      weight: 3,
    });
  } else if (gami.currentStreak >= 3) {
    candidates.push({
      title: `Streak de ${gami.currentStreak} dias`,
      description: "Bora pra mais um.",
      emoji: "🔥",
      weight: 2,
    });
  }

  // Próximo nível perto
  const xpToNext = gami.xpForNextLevel - gami.xpInLevel;
  if (xpToNext > 0 && xpToNext <= 200) {
    candidates.push({
      title: `Faltam ${xpToNext} XP pro nível ${gami.level + 1}`,
      description: "Tá quase lá!",
      emoji: "✨",
      weight: 3,
    });
  }

  // Meta de ontem batida
  const yGh = contribs.find((c) => c.date === yIso)?.count ?? 0;
  const yTr = tasks.find((c) => c.date === yIso)?.count ?? 0;
  const yesterdayActive = yGh > 0 || yTr > 0;
  if (yesterdayActive && yGh + yTr >= 5) {
    candidates.push({
      title: "Ontem você foi produtivo 👏",
      description: `${yGh} contribuições + ${yTr} tarefas. Bora repetir.`,
      emoji: "👏",
      weight: 2,
    });
  }

  // Hábito em risco (streak ativo, não fez hoje)
  for (const h of habits) {
    if (!h.doneToday && h.currentStreak >= 3) {
      candidates.push({
        title: `${h.emoji} ${h.name} hoje?`,
        description: `Streak de ${h.currentStreak} dias em risco.`,
        emoji: "⚠️",
        weight: 5,
      });
      break; // só um por vez
    }
  }

  // Pomodoro hot
  if (pomoStats.todaySessions >= 3) {
    candidates.push({
      title: `${pomoStats.todaySessions} pomodoros hoje 🍅`,
      description: `${pomoStats.todayFocusMin}min de foco. Tá voando.`,
      emoji: "🍅",
      weight: 2,
    });
  }

  // Trello pico de hora
  if (trAnalytics.peakHour && trAnalytics.peakHour.count > 0) {
    const currentHour = today.getHours();
    if (currentHour === trAnalytics.peakHour.hour) {
      candidates.push({
        title: `Hora pico do Trello: ${trAnalytics.peakHour.label}`,
        description: "Esse é o horário em que você costuma fechar mais tarefas.",
        emoji: "⏰",
        weight: 3,
      });
    }
  }

  // Sem nada hoje ainda
  const todayGh = contribs.find((c) => c.date === todayIso)?.count ?? 0;
  const todayTr = tasks.find((c) => c.date === todayIso)?.count ?? 0;
  const hourNow = today.getHours();
  if (hourNow >= 14 && todayGh === 0 && todayTr === 0) {
    candidates.push({
      title: "Dia ainda em branco",
      description: "Que tal começar com 1 pomodoro de 25min?",
      emoji: "💪",
      weight: 4,
    });
  }

  // Mensagem padrão se não tem nada melhor
  if (candidates.length === 0) {
    candidates.push({
      title: `Nível ${gami.level} · ${gami.unlockedBadges}/${gami.totalBadges} conquistas`,
      description: "Bora bater mais uma meta hoje?",
      emoji: "💫",
      weight: 1,
    });
  }

  // Escolhe pelo maior peso (empate -> primeiro)
  candidates.sort((a, b) => b.weight - a.weight);
  return candidates[0];
}
