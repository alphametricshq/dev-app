import { createCard } from "@/lib/integrations/trello-api";
import { findTodoList } from "@/lib/integrations/trello-todo";
import { fetchAssignedIssues } from "@/lib/integrations/github-issues";
import { getLinkedIssueKeys, linkIssue } from "@/lib/db/issues-queries";
import { getSetting, setSetting } from "@/lib/db/queries";

const SETTING_KEY = "issues_to_trello";

export type IssuesSyncConfig = { enabled: boolean };

export async function getIssuesSyncConfig(): Promise<IssuesSyncConfig> {
  const raw = await getSetting(SETTING_KEY);
  if (!raw) return { enabled: false };
  try {
    const parsed = JSON.parse(raw) as Partial<IssuesSyncConfig>;
    return { enabled: !!parsed.enabled };
  } catch {
    return { enabled: false };
  }
}

export async function setIssuesSyncConfig(cfg: IssuesSyncConfig): Promise<void> {
  await setSetting(SETTING_KEY, JSON.stringify(cfg));
}

function buildCardDesc(issue: { htmlUrl: string; repoFullName: string; body: string }): string {
  const parts = [`📌 Issue do GitHub: ${issue.htmlUrl}`, `Repositório: ${issue.repoFullName}`];
  const body = issue.body?.trim();
  if (body) {
    parts.push("", "---", "", body.length > 1500 ? body.slice(0, 1500) + "…" : body);
  }
  return parts.join("\n");
}

/**
 * Registra os issues atuais como "vistos" SEM criar cards. Usado quando o
 * usuário ativa a integração, pra não floodar o board com issues antigas.
 */
export async function baselineIssues(): Promise<{ baselined: number }> {
  const issues = await fetchAssignedIssues();
  const linked = await getLinkedIssueKeys();
  let baselined = 0;
  for (const issue of issues) {
    if (linked.has(issue.key)) continue;
    await linkIssue({
      issueKey: issue.key,
      issueUrl: issue.htmlUrl,
      issueTitle: issue.title,
      cardId: null, // sem card = baseline
      cardUrl: null,
    });
    baselined++;
  }
  return { baselined };
}

/**
 * Cria cards no Trello pros issues atribuídos ainda não convertidos.
 * Só roda se a integração estiver habilitada.
 */
export async function syncIssuesToTrello(): Promise<{ created: number; skipped: number }> {
  const cfg = await getIssuesSyncConfig();
  if (!cfg.enabled) return { created: 0, skipped: 0 };

  const issues = await fetchAssignedIssues();
  if (issues.length === 0) return { created: 0, skipped: 0 };

  const linked = await getLinkedIssueKeys();
  const novos = issues.filter((i) => !linked.has(i.key));
  if (novos.length === 0) return { created: 0, skipped: issues.length };

  const todo = await findTodoList();
  if (!todo) {
    throw new Error("Nenhuma lista encontrada no Trello pra criar os cards");
  }

  let created = 0;
  for (const issue of novos) {
    try {
      const card = await createCard({
        idList: todo.listId,
        name: issue.title,
        desc: buildCardDesc(issue),
        pos: "top",
      });
      await linkIssue({
        issueKey: issue.key,
        issueUrl: issue.htmlUrl,
        issueTitle: issue.title,
        cardId: card.id,
        cardUrl: card.url,
      });
      created++;
    } catch {
      // Se falhar 1 card, segue pros outros
    }
  }
  return { created, skipped: issues.length - created };
}
