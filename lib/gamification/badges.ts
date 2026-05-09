import type { GithubContribDay } from "@/lib/db/queries";

export type BadgeContext = {
  contribs: GithubContribDay[];
  tasksByDay: { date: string; count: number }[];
  totalGithub: number;
  totalTrello: number;
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  habitsCount: number;
  bestHabitStreak: number;
  totalPomodoros: number;
  bestPomodoroDay: number;
};

export type BadgeStatus = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
  unlockedDate?: string;
};

export type BadgeDefinition = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (ctx: BadgeContext) => { unlocked: boolean; progress?: { current: number; target: number } };
};

const BADGES: BadgeDefinition[] = [
  // ========= GitHub milestones =========
  {
    id: "first-commit",
    title: "Primeiro passo",
    description: "Faça sua primeira contribuição",
    emoji: "🌱",
    check: (c) => ({
      unlocked: c.totalGithub >= 1,
      progress: { current: Math.min(c.totalGithub, 1), target: 1 },
    }),
  },
  {
    id: "github-100",
    title: "Centenário",
    description: "100 contribuições no GitHub",
    emoji: "💯",
    check: (c) => ({
      unlocked: c.totalGithub >= 100,
      progress: { current: Math.min(c.totalGithub, 100), target: 100 },
    }),
  },
  {
    id: "github-500",
    title: "Meio-milheiro",
    description: "500 contribuições no GitHub",
    emoji: "🚀",
    check: (c) => ({
      unlocked: c.totalGithub >= 500,
      progress: { current: Math.min(c.totalGithub, 500), target: 500 },
    }),
  },
  {
    id: "github-1000",
    title: "Mil-comiteiro",
    description: "1.000 contribuições",
    emoji: "🏆",
    check: (c) => ({
      unlocked: c.totalGithub >= 1000,
      progress: { current: Math.min(c.totalGithub, 1000), target: 1000 },
    }),
  },

  // ========= Trello milestones =========
  {
    id: "first-task",
    title: "Primeira tarefa",
    description: "Conclua sua primeira tarefa no Trello",
    emoji: "✅",
    check: (c) => ({
      unlocked: c.totalTrello >= 1,
      progress: { current: Math.min(c.totalTrello, 1), target: 1 },
    }),
  },
  {
    id: "trello-25",
    title: "Vinte e cinco",
    description: "25 tarefas concluídas",
    emoji: "📦",
    check: (c) => ({
      unlocked: c.totalTrello >= 25,
      progress: { current: Math.min(c.totalTrello, 25), target: 25 },
    }),
  },
  {
    id: "trello-100",
    title: "Cem tarefas",
    description: "100 tarefas concluídas",
    emoji: "🎯",
    check: (c) => ({
      unlocked: c.totalTrello >= 100,
      progress: { current: Math.min(c.totalTrello, 100), target: 100 },
    }),
  },

  // ========= Streaks =========
  {
    id: "streak-3",
    title: "Trinca",
    description: "3 dias seguidos com contribuições",
    emoji: "🔥",
    check: (c) => ({
      unlocked: c.longestStreak >= 3,
      progress: { current: Math.min(c.longestStreak, 3), target: 3 },
    }),
  },
  {
    id: "streak-7",
    title: "Semana inteira",
    description: "7 dias seguidos",
    emoji: "🌟",
    check: (c) => ({
      unlocked: c.longestStreak >= 7,
      progress: { current: Math.min(c.longestStreak, 7), target: 7 },
    }),
  },
  {
    id: "streak-30",
    title: "Mestre da consistência",
    description: "30 dias seguidos",
    emoji: "💎",
    check: (c) => ({
      unlocked: c.longestStreak >= 30,
      progress: { current: Math.min(c.longestStreak, 30), target: 30 },
    }),
  },
  {
    id: "streak-100",
    title: "Centena ininterrupta",
    description: "100 dias seguidos",
    emoji: "👑",
    check: (c) => ({
      unlocked: c.longestStreak >= 100,
      progress: { current: Math.min(c.longestStreak, 100), target: 100 },
    }),
  },

  // ========= Padrões =========
  {
    id: "weekend-warrior",
    title: "Guerreiro de fim de semana",
    description: "Contribuição em sábado e domingo",
    emoji: "⚔️",
    check: (c) => {
      let satOk = false;
      let sunOk = false;
      for (const d of c.contribs) {
        if (d.count > 0) {
          const day = new Date(d.date + "T12:00:00").getDay();
          if (day === 6) satOk = true;
          if (day === 0) sunOk = true;
        }
      }
      return { unlocked: satOk && sunOk };
    },
  },
  {
    id: "consistency",
    title: "Persistente",
    description: "30 dias ativos no total",
    emoji: "🎖️",
    check: (c) => ({
      unlocked: c.activeDays >= 30,
      progress: { current: Math.min(c.activeDays, 30), target: 30 },
    }),
  },
  {
    id: "century-active",
    title: "100 dias produtivos",
    description: "100 dias ativos no total",
    emoji: "🏅",
    check: (c) => ({
      unlocked: c.activeDays >= 100,
      progress: { current: Math.min(c.activeDays, 100), target: 100 },
    }),
  },
  {
    id: "marathon-day",
    title: "Dia maratona",
    description: "Faça 10+ contribuições em um único dia",
    emoji: "⚡",
    check: (c) => {
      const max = Math.max(0, ...c.contribs.map((d) => d.count));
      return { unlocked: max >= 10, progress: { current: Math.min(max, 10), target: 10 } };
    },
  },
  {
    id: "task-marathon",
    title: "Foco total",
    description: "Conclua 5+ tarefas em um único dia",
    emoji: "🎪",
    check: (c) => {
      const max = Math.max(0, ...c.tasksByDay.map((d) => d.count));
      return { unlocked: max >= 5, progress: { current: Math.min(max, 5), target: 5 } };
    },
  },
  {
    id: "balanced",
    title: "Balanceado",
    description: "Tenha contribuições GitHub E tarefas Trello no mesmo dia",
    emoji: "⚖️",
    check: (c) => {
      const ghDates = new Set(c.contribs.filter((d) => d.count > 0).map((d) => d.date));
      const trDates = c.tasksByDay.filter((d) => d.count > 0).map((d) => d.date);
      const hasOverlap = trDates.some((d) => ghDates.has(d));
      return { unlocked: hasOverlap };
    },
  },

  // ========= Hábitos =========
  {
    id: "first-habit",
    title: "Primeiro hábito",
    description: "Crie seu primeiro hábito diário",
    emoji: "🌿",
    check: (c) => ({
      unlocked: c.habitsCount >= 1,
      progress: { current: Math.min(c.habitsCount, 1), target: 1 },
    }),
  },
  {
    id: "habit-streak-7",
    title: "Constância",
    description: "7 dias seguidos em qualquer hábito",
    emoji: "🌳",
    check: (c) => ({
      unlocked: c.bestHabitStreak >= 7,
      progress: { current: Math.min(c.bestHabitStreak, 7), target: 7 },
    }),
  },
  {
    id: "habit-streak-30",
    title: "Disciplina",
    description: "30 dias seguidos em qualquer hábito",
    emoji: "⛰️",
    check: (c) => ({
      unlocked: c.bestHabitStreak >= 30,
      progress: { current: Math.min(c.bestHabitStreak, 30), target: 30 },
    }),
  },

  // ========= Pomodoro =========
  {
    id: "first-pomodoro",
    title: "Primeiro pomodoro",
    description: "Complete sua primeira sessão de foco",
    emoji: "🍅",
    check: (c) => ({
      unlocked: c.totalPomodoros >= 1,
      progress: { current: Math.min(c.totalPomodoros, 1), target: 1 },
    }),
  },
  {
    id: "pomodoro-day-10",
    title: "Maratona de foco",
    description: "10 pomodoros em um único dia",
    emoji: "🧠",
    check: (c) => ({
      unlocked: c.bestPomodoroDay >= 10,
      progress: { current: Math.min(c.bestPomodoroDay, 10), target: 10 },
    }),
  },
  {
    id: "pomodoro-100",
    title: "Centena de foco",
    description: "100 pomodoros completos",
    emoji: "🎓",
    check: (c) => ({
      unlocked: c.totalPomodoros >= 100,
      progress: { current: Math.min(c.totalPomodoros, 100), target: 100 },
    }),
  },
];

export function evaluateBadges(ctx: BadgeContext): BadgeStatus[] {
  return BADGES.map((b) => {
    const r = b.check(ctx);
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      emoji: b.emoji,
      unlocked: r.unlocked,
      progress: r.progress,
    };
  });
}
