import { createCard } from "@/lib/integrations/trello-api";
import { findTodoList } from "@/lib/integrations/trello-todo";
import { fetchProjectItems, type ProjectItem } from "@/lib/integrations/github-project";
import { getLinkedIssueKeys, getLinkedIssueUrls, linkIssue } from "@/lib/db/issues-queries";
import { getSetting, setSetting } from "@/lib/db/queries";
import { withSyncLock } from "@/lib/sync-lock";
import { getCredential } from "@/lib/credentials/store";

const SETTING_KEY = "project_to_trello";

export const DEFAULT_STATUSES = ["📅 Esta Semana", "🚧 Em Andamento", "👀 Review"];

export type ProjectSyncConfig = {
  enabled: boolean;
  org: string;
  projectNumber: number;
  statuses: string[];
};

const DEFAULT_CONFIG: ProjectSyncConfig = {
  enabled: false,
  org: "alphametricshq",
  projectNumber: 1,
  statuses: DEFAULT_STATUSES,
};

export async function getProjectSyncConfig(): Promise<ProjectSyncConfig> {
  const raw = await getSetting(SETTING_KEY);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    const p = JSON.parse(raw) as Partial<ProjectSyncConfig>;
    return {
      enabled: !!p.enabled,
      org: p.org || DEFAULT_CONFIG.org,
      projectNumber: typeof p.projectNumber === "number" ? p.projectNumber : DEFAULT_CONFIG.projectNumber,
      statuses: Array.isArray(p.statuses) && p.statuses.length > 0 ? p.statuses : DEFAULT_CONFIG.statuses,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function setProjectSyncConfig(cfg: ProjectSyncConfig): Promise<void> {
  await setSetting(SETTING_KEY, JSON.stringify(cfg));
}

// key estável por item do project (independe do título mudar)
function itemKey(item: ProjectItem): string {
  return `project:${item.itemId}`;
}

function buildDesc(item: ProjectItem): string {
  const parts: string[] = [];
  if (item.url) parts.push(`📌 ${item.url}`);
  if (item.repoFullName) parts.push(`Repo: ${item.repoFullName}`);
  if (item.status) parts.push(`Status: ${item.status}`);
  return parts.join("\n");
}

/** Filtra itens: atribuídos a mim, status selecionado, não fechados. */
function filterRelevant(items: ProjectItem[], cfg: ProjectSyncConfig, myLogin: string): ProjectItem[] {
  const me = myLogin.toLowerCase();
  const wanted = new Set(cfg.statuses);
  return items.filter((it) => {
    if (it.state === "CLOSED") return false;
    if (!it.status || !wanted.has(it.status)) return false;
    return it.assignees.some((a) => a.toLowerCase() === me);
  });
}

export async function baselineProject(): Promise<{ baselined: number }> {
  const cfg = await getProjectSyncConfig();
  const myLogin = getCredential("GITHUB_USERNAME");
  if (!myLogin) throw new Error("GITHUB_USERNAME ausente");
  const items = await fetchProjectItems(cfg.org, cfg.projectNumber);
  const relevant = filterRelevant(items, cfg, myLogin);
  const linked = await getLinkedIssueKeys();
  let baselined = 0;
  for (const it of relevant) {
    const key = itemKey(it);
    if (linked.has(key)) continue;
    await linkIssue({ issueKey: key, issueUrl: it.url, issueTitle: it.title, cardId: null, cardUrl: null });
    baselined++;
  }
  return { baselined };
}

export async function syncProjectToTrello(): Promise<{ created: number; skipped: number }> {
  // Lock impede execuções concorrentes (auto-sync + manual) de duplicar cards
  return withSyncLock("project-to-trello", { created: 0, skipped: 0 }, () => doSync());
}

async function doSync(): Promise<{ created: number; skipped: number }> {
  const cfg = await getProjectSyncConfig();
  if (!cfg.enabled) return { created: 0, skipped: 0 };

  const myLogin = getCredential("GITHUB_USERNAME");
  if (!myLogin) throw new Error("GITHUB_USERNAME ausente");

  const items = await fetchProjectItems(cfg.org, cfg.projectNumber);
  const relevant = filterRelevant(items, cfg, myLogin);
  if (relevant.length === 0) return { created: 0, skipped: 0 };

  const [linked, linkedUrls] = await Promise.all([getLinkedIssueKeys(), getLinkedIssueUrls()]);
  // Dedupe por key E por URL — o mesmo issue pode já ter virado card via
  // a integração de Issues (key repo#N, mesma URL)
  const novos = relevant.filter(
    (it) => !linked.has(itemKey(it)) && !(it.url && linkedUrls.has(it.url)),
  );
  if (novos.length === 0) return { created: 0, skipped: relevant.length };

  const todo = await findTodoList();
  if (!todo) throw new Error("Nenhuma lista encontrada no Trello pra criar os cards");

  let created = 0;
  for (const it of novos) {
    try {
      const card = await createCard({
        idList: todo.listId,
        name: it.title,
        desc: buildDesc(it),
        pos: "top",
      });
      await linkIssue({
        issueKey: itemKey(it),
        issueUrl: it.url,
        issueTitle: it.title,
        cardId: card.id,
        cardUrl: card.url,
      });
      created++;
    } catch {
      // segue
    }
  }
  return { created, skipped: relevant.length - created };
}
