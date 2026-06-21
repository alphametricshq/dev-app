// Sistema de XP e niveis derivado dos dados existentes (sem tabela nova)

export const XP_PER_GITHUB_CONTRIB = 5;
export const XP_PER_ACTIVE_DAY = 50;
export const XP_PER_STREAK_DAY = 15;
export const XP_PER_POMODORO = 15;

export type XpBreakdown = {
  github: number;
  activeDays: number;
  streak: number;
  pomodoros: number;
  total: number;
};

export type LevelInfo = {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  progressPct: number;
  totalForNext: number;
};

/**
 * Curva exponencial suave: nivel N requer (N * 100)^1.18 XP acumulado.
 * Nivel 1 -> 0 XP
 * Nivel 2 -> 100 XP
 * Nivel 5 -> ~838 XP
 * Nivel 10 -> ~2511 XP
 * Nivel 20 -> ~7585 XP
 * Nivel 50 -> ~33810 XP
 */
function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(Math.pow((level - 1) * 100, 1.18));
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const currentLevelStart = xpForLevel(level);
  const nextLevelStart = xpForLevel(level + 1);
  const xpInLevel = xp - currentLevelStart;
  const xpForNextLevel = nextLevelStart - currentLevelStart;
  const progressPct = xpForNextLevel === 0 ? 100 : (xpInLevel / xpForNextLevel) * 100;
  return {
    xp,
    level,
    xpInLevel,
    xpForNextLevel,
    progressPct: Math.min(100, Math.max(0, progressPct)),
    totalForNext: nextLevelStart,
  };
}

export function computeXp(input: {
  totalGithubContribs: number;
  activeDays: number;
  currentStreak: number;
  totalPomodoros?: number;
}): XpBreakdown {
  const github = input.totalGithubContribs * XP_PER_GITHUB_CONTRIB;
  const activeDays = input.activeDays * XP_PER_ACTIVE_DAY;
  const streak = input.currentStreak * XP_PER_STREAK_DAY;
  const pomodoros = (input.totalPomodoros ?? 0) * XP_PER_POMODORO;
  const total = github + activeDays + streak + pomodoros;
  return { github, activeDays, streak, pomodoros, total };
}

// Titulos por faixa de nivel (gamificacao narrativa)
const LEVEL_TITLES: { min: number; title: string }[] = [
  { min: 1, title: "Iniciante" },
  { min: 5, title: "Aprendiz" },
  { min: 10, title: "Praticante" },
  { min: 20, title: "Veterano" },
  { min: 35, title: "Expert" },
  { min: 50, title: "Mestre" },
  { min: 75, title: "Grandmaster" },
  { min: 100, title: "Lenda" },
];

export function levelTitle(level: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const t of LEVEL_TITLES) {
    if (level >= t.min) title = t.title;
  }
  return title;
}
