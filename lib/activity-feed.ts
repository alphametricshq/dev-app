import { db, initDb } from "@/lib/db";

export type ActivityType = "pomodoro" | "habit" | "journal" | "trello";

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  timestamp: string; // ISO local "YYYY-MM-DD HH:MM:SS"
  title: string;
  description?: string;
  emoji?: string;
};

export async function getRecentActivity(days = 7, limit = 40): Promise<ActivityEvent[]> {
  await initDb();
  const c = db();

  const events: ActivityEvent[] = [];

  const pomos = await c.execute({
    sql: `SELECT id, type, duration_min, finished_at, card_name
          FROM pomodoro_sessions
          WHERE completed = 1 AND finished_at >= datetime('now', ?)
          ORDER BY finished_at DESC LIMIT ?`,
    args: [`-${days} days`, limit],
  });
  for (const r of pomos.rows) {
    const type = r.type as string;
    events.push({
      id: `pomo-${r.id}`,
      type: "pomodoro",
      timestamp: r.finished_at as string,
      title:
        type === "focus"
          ? `Foco de ${r.duration_min}min`
          : type === "short_break"
            ? "Pausa curta"
            : "Pausa longa",
      description: r.card_name ? String(r.card_name) : undefined,
      emoji: type === "focus" ? "🍅" : "☕",
    });
  }

  const habits = await c.execute({
    sql: `SELECT hl.habit_id, hl.logged_at, h.name, h.emoji
          FROM habit_logs hl
          JOIN habits h ON h.id = hl.habit_id
          WHERE hl.date >= date('now', ?)
          ORDER BY hl.logged_at DESC LIMIT ?`,
    args: [`-${days} days`, limit],
  });
  for (const r of habits.rows) {
    events.push({
      id: `habit-${r.habit_id}-${r.logged_at}`,
      type: "habit",
      timestamp: r.logged_at as string,
      title: `${r.name} concluído`,
      emoji: (r.emoji as string) || "✨",
    });
  }

  const journal = await c.execute({
    sql: `SELECT id, content, mood, created_at
          FROM journal_entries
          WHERE created_at >= datetime('now', ?)
          ORDER BY created_at DESC LIMIT ?`,
    args: [`-${days} days`, limit],
  });
  for (const r of journal.rows) {
    const content = r.content as string;
    const preview = content.length > 80 ? content.slice(0, 80) + "..." : content;
    events.push({
      id: `journal-${r.id}`,
      type: "journal",
      timestamp: r.created_at as string,
      title: "Nova nota",
      description: preview,
      emoji: (r.mood as string) || "📝",
    });
  }

  const trello = await c.execute({
    sql: `SELECT id, card_name, board_name, completed_at
          FROM trello_tasks_completed
          WHERE completed_at >= datetime('now', ?)
          ORDER BY completed_at DESC LIMIT ?`,
    args: [`-${days} days`, limit],
  });
  for (const r of trello.rows) {
    events.push({
      id: `trello-${r.id}`,
      type: "trello",
      timestamp: r.completed_at as string,
      title: r.card_name as string,
      description: r.board_name ? String(r.board_name) : undefined,
      emoji: "✅",
    });
  }

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return events.slice(0, limit);
}
