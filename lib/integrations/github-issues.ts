import { getCredential } from "@/lib/credentials/store";

const GH_API = "https://api.github.com";

export type AssignedIssue = {
  key: string; // owner/repo#number
  number: number;
  title: string;
  body: string;
  htmlUrl: string;
  repoFullName: string;
  state: string;
};

type RawIssue = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  pull_request?: unknown;
  repository?: { full_name: string };
};

/**
 * Busca issues abertas atribuídas ao usuário autenticado (em todos os repos
 * que o token enxerga). Exclui pull requests. Usa REST API v3.
 */
export async function fetchAssignedIssues(): Promise<AssignedIssue[]> {
  const token = getCredential("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN ausente");

  const issues: AssignedIssue[] = [];
  // Pagina até 5 páginas (500 issues) por segurança
  for (let page = 1; page <= 5; page++) {
    const url = new URL(`${GH_API}/issues`);
    url.searchParams.set("filter", "assigned");
    url.searchParams.set("state", "open");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "dashboard-pessoal",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new Error(`GitHub issues ${res.status}: ${await res.text()}`);
    }
    const batch = (await res.json()) as RawIssue[];
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const it of batch) {
      // O endpoint /issues também devolve PRs — pular
      if (it.pull_request) continue;
      const repoFullName = it.repository?.full_name ?? "?";
      issues.push({
        key: `${repoFullName}#${it.number}`,
        number: it.number,
        title: it.title,
        body: it.body ?? "",
        htmlUrl: it.html_url,
        repoFullName,
        state: it.state,
      });
    }
    if (batch.length < 100) break;
  }

  return issues;
}
