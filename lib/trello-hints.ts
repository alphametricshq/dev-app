// Fonte única dos hints de nomes de listas do Trello.
// Usado pelo sync de concluídas, seletor de cards do pomodoro,
// quick task e integrações GitHub -> Trello.

export const DONE_LIST_HINTS = [
  "done",
  "concluído",
  "concluido",
  "feito",
  "finalizado",
  "completo",
  "completed",
];

export const TODO_LIST_HINTS = ["to-do", "todo", "to do", "a fazer", "afazer", "backlog", "pra fazer"];

export function isDoneListName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return DONE_LIST_HINTS.some((h) => lower.includes(h));
}

export function isTodoListName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return TODO_LIST_HINTS.some((h) => lower.includes(h));
}
