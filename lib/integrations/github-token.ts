// Resolve um token GitHub com acesso a Projects (read:project / project).
// Ordem: GITHUB_PROJECT_TOKEN > GITHUB_TOKEN > token do gh CLI (gh auth token).
// O token que funcionar fica cacheado e é tentado primeiro nas próximas chamadas.

import { execFile } from "node:child_process";
import { getCredential } from "@/lib/credentials/store";

const GH_GRAPHQL = "https://api.github.com/graphql";

let ghCliCache: { token: string; at: number } | null = null;
let lastGoodToken: string | null = null;

function ghCliToken(): Promise<string | null> {
  if (ghCliCache && Date.now() - ghCliCache.at < 10 * 60_000) {
    return Promise.resolve(ghCliCache.token);
  }
  return new Promise((resolve) => {
    execFile(
      "gh",
      ["auth", "token"],
      // shell no Windows pra resolver gh.exe/gh.cmd no PATH
      { timeout: 5000, shell: process.platform === "win32" },
      (err, stdout) => {
        if (err) return resolve(null);
        const token = String(stdout).trim();
        if (!token) return resolve(null);
        ghCliCache = { token, at: Date.now() };
        resolve(token);
      },
    );
  });
}

async function tokenCandidates(): Promise<string[]> {
  const out: string[] = [];
  const push = (t: string | undefined | null) => {
    if (t && !out.includes(t)) out.push(t);
  };
  push(lastGoodToken);
  push(getCredential("GITHUB_PROJECT_TOKEN"));
  push(getCredential("GITHUB_TOKEN"));
  push(await ghCliToken());
  return out;
}

function isScopeError(msg: string): boolean {
  return /scope|read:project/i.test(msg);
}

export class ProjectAuthError extends Error {}

/**
 * Executa uma query/mutation GraphQL contra o GitHub tentando os tokens
 * disponíveis até um ter o escopo necessário. Lança ProjectAuthError quando
 * nenhum token funciona (com instrução de como resolver).
 */
export async function projectGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const candidates = await tokenCandidates();
  if (candidates.length === 0) {
    throw new ProjectAuthError("Nenhum GITHUB_TOKEN configurado e gh CLI não está logado.");
  }

  let lastErr = "";
  for (const token of candidates) {
    const res = await fetch(GH_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "dashboard-pessoal",
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      lastErr = `HTTP ${res.status}: ${await res.text()}`;
      continue;
    }
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) {
      const msg = json.errors.map((e) => e.message).join("; ");
      if (isScopeError(msg)) {
        lastErr = msg;
        continue; // tenta o próximo token
      }
      throw new Error(msg);
    }
    if (!json.data) {
      lastErr = "Resposta sem data";
      continue;
    }
    lastGoodToken = token;
    return json.data;
  }

  throw new ProjectAuthError(
    `Nenhum token tem acesso ao Project (escopo read:project/project). ` +
      `Soluções: (1) logar no gh CLI com "gh auth refresh -s project", ou ` +
      `(2) definir GITHUB_PROJECT_TOKEN no .env.local com um token classic que tenha o escopo "project". ` +
      `Último erro: ${lastErr}`,
  );
}
