"use client";

import type { WeeklyReview } from "@/lib/weekly-review";

function arrow(delta: number): string {
  if (delta > 0) return `▲ +${delta}`;
  if (delta < 0) return `▼ ${delta}`;
  return "= 0";
}

/**
 * Gera um resumo da semana em Markdown — pronto pra colar num chat,
 * issue ou e-mail de status.
 */
export function weeklyReviewToMarkdown(r: WeeklyReview): string {
  const lines: string[] = [];
  lines.push(`# Retrospectiva — ${r.weekLabel}${r.isCurrent ? " (semana atual)" : ""}`);
  lines.push("");

  lines.push("## Resumo");
  lines.push(`- **${r.highlights.totalActions}** ações no total (commits + tarefas)`);
  lines.push(`- **${r.highlights.activeDays}** dias ativos`);
  if (r.highlights.bestWeekday) lines.push(`- Melhor dia: **${r.highlights.bestWeekday}**`);
  lines.push(`- XP ganho: **${r.xp.earned}**`);
  lines.push("");

  lines.push("## GitHub");
  lines.push(
    `- ${r.github.current} contribuições (${arrow(r.github.delta)} vs semana anterior)`,
  );
  if (r.github.bestDay && r.github.bestDay.count > 0) {
    lines.push(`- Pico: ${r.github.bestDay.weekday} com ${r.github.bestDay.count}`);
  }
  lines.push("");

  lines.push("## Trello");
  lines.push(`- ${r.trello.current} tarefas concluídas (${arrow(r.trello.delta)} vs semana anterior)`);
  if (r.trello.topBoards.length > 0) {
    lines.push(
      `- Boards mais ativos: ${r.trello.topBoards
        .slice(0, 3)
        .map((b) => `${b.board_name} (${b.count})`)
        .join(", ")}`,
    );
  }
  lines.push("");

  if (r.habits.summary.length > 0) {
    lines.push("## Hábitos");
    lines.push(`- ${r.habits.totalCompletions} marcações · ${r.habits.perfectDays} dia(s) perfeito(s)`);
    for (const h of r.habits.summary) {
      const check = h.completed >= h.target ? "✅" : "▫️";
      lines.push(`- ${check} ${h.emoji} ${h.name}: ${h.completed}/${h.target}`);
    }
    lines.push("");
  }

  if (r.insights.length > 0) {
    lines.push("## Insights");
    for (const i of r.insights) lines.push(`- ${i}`);
    lines.push("");
  }

  return lines.join("\n");
}
