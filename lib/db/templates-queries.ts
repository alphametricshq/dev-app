import { db, initDb } from "./index";

export type TemplateType = "card" | "habit";

export type CardTemplateData = {
  name: string;
  desc?: string;
  checklists?: { name: string; items: string[] }[];
};

export type HabitTemplateData = {
  name: string;
  emoji?: string;
  color?: string;
  target_per_week?: number;
};

export type Template<T = CardTemplateData | HabitTemplateData> = {
  id: number;
  type: TemplateType;
  name: string;
  data: T;
  created_at: string;
};

function rowToTemplate(row: Record<string, unknown>): Template {
  let data: CardTemplateData | HabitTemplateData = { name: "" };
  try {
    data = JSON.parse(row.data as string);
  } catch {
    // fallback vazio
  }
  return {
    id: Number(row.id),
    type: row.type as TemplateType,
    name: row.name as string,
    data,
    created_at: row.created_at as string,
  };
}

export async function listTemplates(type?: TemplateType): Promise<Template[]> {
  await initDb();
  const c = db();
  const r = type
    ? await c.execute({
        sql: `SELECT id, type, name, data, created_at FROM templates WHERE type = ? ORDER BY name ASC`,
        args: [type],
      })
    : await c.execute(`SELECT id, type, name, data, created_at FROM templates ORDER BY type, name`);
  return r.rows.map((row) => rowToTemplate(row as unknown as Record<string, unknown>));
}

export async function createTemplate(
  type: TemplateType,
  name: string,
  data: CardTemplateData | HabitTemplateData,
): Promise<Template> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `INSERT INTO templates (type, name, data) VALUES (?, ?, ?)
          RETURNING id, type, name, data, created_at`,
    args: [type, name, JSON.stringify(data)],
  });
  return rowToTemplate(r.rows[0] as unknown as Record<string, unknown>);
}

export async function deleteTemplate(id: number): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({ sql: `DELETE FROM templates WHERE id = ?`, args: [id] });
}
