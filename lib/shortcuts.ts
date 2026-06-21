// Lista canônica de atalhos. Usado pelo provider e pelo modal de ajuda.

export type Shortcut = {
  keys: string[]; // ex: ["g", "h"] ou ["?"]
  label: string;
  category: "Navegação" | "Ações" | "Geral";
};

export const SHORTCUTS: Shortcut[] = [
  // Navegação (prefixo g)
  { keys: ["g", "d"], label: "Visão geral", category: "Navegação" },
  { keys: ["g", "f"], label: "Foco (Pomodoro)", category: "Navegação" },
  { keys: ["g", "p"], label: "Demandas (Project)", category: "Navegação" },
  { keys: ["g", "e"], label: "Equipe", category: "Navegação" },
  { keys: ["g", "h"], label: "Hábitos", category: "Navegação" },
  { keys: ["g", "j"], label: "Journal", category: "Navegação" },
  { keys: ["g", "r"], label: "Retrospectiva", category: "Navegação" },
  { keys: ["g", "c"], label: "Conquistas", category: "Navegação" },
  { keys: ["g", "g"], label: "GitHub", category: "Navegação" },
  { keys: ["g", "s"], label: "Configurações", category: "Navegação" },
  // Ações
  { keys: ["n"], label: "Nova nota (Journal)", category: "Ações" },
  { keys: ["p"], label: "Iniciar pomodoro de 25min", category: "Ações" },
  { keys: ["s"], label: "Sincronizar agora", category: "Ações" },
  // Geral
  { keys: ["Ctrl", "K"], label: "Command palette", category: "Geral" },
  { keys: ["?"], label: "Mostrar atalhos", category: "Geral" },
  { keys: ["Esc"], label: "Fechar modais", category: "Geral" },
];

export const ROUTE_KEYS: Record<string, string> = {
  d: "/",
  f: "/foco",
  p: "/demandas",
  e: "/equipe",
  h: "/habitos",
  j: "/journal",
  r: "/retrospectiva",
  c: "/conquistas",
  g: "/github",
  s: "/settings",
};
