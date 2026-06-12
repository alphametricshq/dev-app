// Resolve um token GitHub com acesso a Projects (read:project / project).
// Ordem: GITHUB_PROJECT_TOKEN > GITHUB_TOKEN > token do gh CLI (gh auth token).
// O token que funcionar fica cacheado e é tentado primeiro nas próximas chamadas.

import { execFile } from "node:child_process";
import path from "node:path";
import { getCredential } from "@/lib/credentials/store";

const GH_GRAPHQL = "https://api.github.com/graphql";

let ghCliCache: { token: string; at: number } | null = null;
let lastGoodToken: string | null = null;

// Candidatos pro binário do gh — o PATH do server pode estar capado
// (ex: dev server iniciado de um shell minimalista), então tentamos
// também os caminhos de instalação padrão.
function ghBinaries(): string[] {
  if (process.platform === "win32") {
    return [
      "gh",
      "C:\\Program Files\\GitHub CLI\\gh.exe",
      path.join(process.env.LOCALAPPDATA ?? "", "Programs", "GitHub CLI", "gh.exe"),
    ];
  }
  return ["gh", "/usr/local/bin/gh", "/opt/homebrew/bin/gh"];
}

function tryExecGhToken(bin: string): Promise<string | null> {
  // GH_TOKEN/GITHUB_TOKEN no env fazem "gh auth token" ecoar a env var em vez
  // do token do keyring (que é o que queremos — ele tem escopo project).
  const env = { ...process.env };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  return new Promise((resolve) => {
    execFile(bin, ["auth", "token"], { timeout: 5000, env }, (err, stdout) => {
      if (err) return resolve(null);
      const token = String(stdout).trim();
      resolve(token || null);
    });
  });
}

async function ghCliToken(): Promise<string | null> {
  if (ghCliCache && Date.now() - ghCliCache.at < 10 * 60_000) {
    return ghCliCache.token;
  }
  for (const bin of ghBinaries()) {
    const token = await tryExecGhToken(bin);
    if (token) {
      ghCliCache = { token, at: Date.now() };
      return token;
    }
  }
  return null;
}

async function tokenCandidates(): Promise<{ tokens: string[]; ghCliFound: boolean }> {
  const out: string[] = [];
  const push = (t: string | undefined | null) => {
    if (t && !out.includes(t)) out.push(t);
  };
  push(lastGoodToken);
  push(getCredential("GITHUB_PROJECT_TOKEN"));
  push(getCredential("GITHUB_TOKEN"));
  const ghToken = await ghCliToken();
  push(ghToken);
  return { tokens: out, ghCliFound: !!ghToken };
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
  opts?: { tolerateNotFound?: boolean },
): Promise<T> {
  const { tokens: candidates, ghCliFound } = await tokenCandidates();
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
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      lastErr = `HTTP ${res.status}: ${await res.text()}`;
      continue;
    }
    const json = (await res.json()) as {
      data?: T;
      errors?: { message: string; type?: string }[];
    };
    if (json.errors?.length) {
      const msg = json.errors.map((e) => e.message).join("; ");
      if (isScopeError(msg)) {
        lastErr = msg;
        continue; // tenta o próximo token
      }
      // Com tolerateNotFound, erros NOT_FOUND acompanhados de data parcial não
      // derrubam a chamada — ex.: field(name:"Cliente") que não existe no
      // Project retorna data com o alias null + um erro NOT_FOUND. O chamador
      // precisa tratar os campos ausentes. Nunca usar em mutations.
      const allNotFound = json.errors.every((e) => e.type === "NOT_FOUND");
      if (!(opts?.tolerateNotFound && allNotFound && json.data)) {
        throw new Error(msg);
      }
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
      `Tokens tentados: ${candidates.length} · gh CLI ${ghCliFound ? "encontrado" : "NÃO encontrado no PATH/instalação"}. ` +
      `Soluções: (1) logar no gh CLI com "gh auth refresh -s project", ou ` +
      `(2) definir GITHUB_PROJECT_TOKEN no .env.local com um token classic que tenha o escopo "project". ` +
      `Último erro: ${lastErr.slice(0, 300)}`,
  );
}
