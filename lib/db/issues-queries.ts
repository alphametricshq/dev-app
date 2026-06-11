import { db, initDb } from "./index";

export type IssueLink = {
  issue_key: string;
  issue_url: string | null;
  issue_title: string | null;
  card_id: string | null;
  card_url: string | null;
  created_at: string;
};

export async function getLinkedIssueKeys(): Promise<Set<string>> {
  await initDb();
  const c = db();
  const r = await c.execute(`SELECT issue_key FROM issue_card_links`);
  return new Set(r.rows.map((row) => row.issue_key as string));
}

/**
 * URLs de issues já linkadas (qualquer integração). Usado pra dedupe
 * cruzado: o mesmo issue pode chegar via Issues→Trello (key repo#N) e
 * via Project→Trello (key project:ITEMID) — sem isso viram 2 cards.
 */
export async function getLinkedIssueUrls(): Promise<Set<string>> {
  await initDb();
  const c = db();
  const r = await c.execute(
    `SELECT issue_url FROM issue_card_links WHERE issue_url IS NOT NULL AND issue_url != ''`,
  );
  return new Set(r.rows.map((row) => row.issue_url as string));
}

export async function linkIssue(input: {
  issueKey: string;
  issueUrl?: string | null;
  issueTitle?: string | null;
  cardId?: string | null;
  cardUrl?: string | null;
}): Promise<void> {
  await initDb();
  const c = db();
  await c.execute({
    sql: `INSERT INTO issue_card_links (issue_key, issue_url, issue_title, card_id, card_url)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(issue_key) DO NOTHING`,
    args: [
      input.issueKey,
      input.issueUrl ?? null,
      input.issueTitle ?? null,
      input.cardId ?? null,
      input.cardUrl ?? null,
    ],
  });
}

export async function countLinkedIssues(): Promise<number> {
  await initDb();
  const c = db();
  const r = await c.execute(`SELECT COUNT(*) AS n FROM issue_card_links`);
  return Number(r.rows[0]?.n ?? 0);
}

export async function listRecentIssueLinks(limit = 10): Promise<IssueLink[]> {
  await initDb();
  const c = db();
  const r = await c.execute({
    sql: `SELECT issue_key, issue_url, issue_title, card_id, card_url, created_at
          FROM issue_card_links
          WHERE card_id IS NOT NULL AND card_id != ''
          ORDER BY created_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return r.rows.map((row) => ({
    issue_key: row.issue_key as string,
    issue_url: row.issue_url as string | null,
    issue_title: row.issue_title as string | null,
    card_id: row.card_id as string | null,
    card_url: row.card_url as string | null,
    created_at: row.created_at as string,
  }));
}
