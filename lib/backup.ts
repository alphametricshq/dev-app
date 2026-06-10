import { db, initDb } from "@/lib/db";

export const BACKUP_VERSION = 1;

const TABLES = [
  "pomodoro_sessions",
  "habits",
  "habit_logs",
  "pinned_cards",
  "journal_entries",
  "settings",
] as const;

type TableName = (typeof TABLES)[number];

type RowValue = string | number | null;
type Row = Record<string, RowValue>;

// Whitelist de colunas por tabela — nomes de coluna NUNCA podem vir do JSON
// direto pro SQL (injeção). Mantém em sincronia com SCHEMA_SQL de lib/db/index.ts.
const TABLE_COLUMNS: Record<TableName, readonly string[]> = {
  pomodoro_sessions: ["id", "type", "duration_min", "started_at", "finished_at", "card_id", "card_name", "completed"],
  habits: ["id", "name", "emoji", "color", "target_per_week", "archived", "position", "created_at"],
  habit_logs: ["habit_id", "date", "logged_at"],
  pinned_cards: ["card_id", "board_id", "card_name", "list_name", "url", "pinned_at"],
  journal_entries: ["id", "content", "tags", "mood", "created_at", "updated_at"],
  settings: ["key", "value", "updated_at"],
};

export type Backup = {
  version: number;
  exportedAt: string;
  tables: Record<TableName, Row[]>;
};

function rowToPlain(row: Record<string, unknown>): Row {
  const r: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) r[k] = null;
    else if (typeof v === "number" || typeof v === "string") r[k] = v;
    else if (typeof v === "bigint") r[k] = Number(v);
    else r[k] = String(v);
  }
  return r;
}

export async function exportData(): Promise<Backup> {
  await initDb();
  const c = db();
  const tables = {} as Record<TableName, Row[]>;
  for (const t of TABLES) {
    const r = await c.execute(`SELECT * FROM ${t}`);
    tables[t] = r.rows.map((row) => rowToPlain(row as unknown as Record<string, unknown>));
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export async function importData(backup: unknown): Promise<{ counts: Record<string, number> }> {
  await initDb();
  const c = db();

  if (
    typeof backup !== "object" ||
    !backup ||
    typeof (backup as { version?: number }).version !== "number" ||
    typeof (backup as { tables?: unknown }).tables !== "object" ||
    !(backup as { tables: unknown }).tables
  ) {
    throw new Error("Formato de backup inválido");
  }
  const b = backup as Backup;
  if (b.version !== BACKUP_VERSION) {
    throw new Error(`Versão de backup incompatível: ${b.version}, esperado ${BACKUP_VERSION}`);
  }

  const counts: Record<string, number> = {};

  // Order matters: habit_logs depende de habits
  const order: TableName[] = [
    "settings",
    "pomodoro_sessions",
    "pinned_cards",
    "journal_entries",
    "habits",
    "habit_logs",
  ];

  // Monta TODOS os statements (deletes + inserts) num batch único:
  // o libsql executa batch em transação — falha em qualquer ponto faz
  // rollback completo em vez de deixar o banco pela metade.
  const stmts: { sql: string; args: RowValue[] }[] = [];

  // Limpa habit_logs antes de habits (foreign key)
  stmts.push({ sql: "DELETE FROM habit_logs", args: [] });
  for (const t of TABLES) {
    if (t === "habit_logs") continue;
    stmts.push({ sql: `DELETE FROM ${t}`, args: [] });
  }

  for (const t of order) {
    const rows = b.tables[t] ?? [];
    const allowed = TABLE_COLUMNS[t];
    counts[t] = 0;
    for (const row of rows) {
      // Só colunas da whitelist — nomes vindos do JSON jamais entram no SQL
      const cols = Object.keys(row).filter((k) => allowed.includes(k));
      if (cols.length === 0) continue;
      const placeholders = cols.map(() => "?").join(",");
      const values = cols.map((k) => row[k]);
      stmts.push({
        sql: `INSERT INTO ${t} (${cols.join(",")}) VALUES (${placeholders})`,
        args: values,
      });
      counts[t]++;
    }
  }

  await c.batch(stmts, "write");

  return { counts };
}
