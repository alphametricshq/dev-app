import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { githubFetchRaw } from "@/lib/integrations/github-token";
import { SDK_REPO_OWNER, SDK_REPO_NAME } from "./manifest-source";
import type { SdkComponent } from "./types";

const execFileAsync = promisify(execFile);

export type InstallResult =
  | { kind: "installed"; component: string; message?: string }
  | { kind: "skipped"; component: string; reason: string }
  | { kind: "external-action-needed"; component: string; url: string }
  | { kind: "error"; component: string; error: string };

function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  if (p === "~") return os.homedir();
  return p;
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Instala (ou atualiza) um único componente, idempotente.
 * - claude-skill / claude-agent: baixa source do repo SDK e escreve em target
 * - claude-mcp: baixa JSON e MERGE em target (preserva entries existentes)
 * - obsidian-vault: git clone (pula se pasta já existe e tem .git)
 * - external-app: não instala — devolve URL pro user abrir manualmente
 */
export async function installComponent(c: SdkComponent): Promise<InstallResult> {
  try {
    switch (c.type) {
      case "claude-skill":
        return await installClaudeSkill(c);
      case "claude-agent":
        return await installClaudeAgent(c);
      case "claude-mcp":
        return await installClaudeMcp(c);
      case "obsidian-vault":
        return await installObsidianVault(c);
      case "external-app":
        return {
          kind: "external-action-needed",
          component: c.id,
          url: c.installUrl ?? "",
        };
    }
  } catch (e) {
    return {
      kind: "error",
      component: c.id,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// Skills moram em ~/.claude/skills/<name>/ com SKILL.md + (opcional) outros arquivos.
// Pra MVP, baixamos só o SKILL.md. Skills mais complexas (com helpers .py, etc)
// vão precisar de listing do diretório — Fase 3.
async function installClaudeSkill(c: SdkComponent): Promise<InstallResult> {
  if (!c.source || !c.target) {
    return { kind: "skipped", component: c.id, reason: "source/target ausente" };
  }
  // source pode ser "skills/<name>/" — busca SKILL.md dentro
  const sourcePath = c.source.endsWith("/") ? `${c.source}SKILL.md` : c.source;
  const content = await githubFetchRaw(SDK_REPO_OWNER, SDK_REPO_NAME, sourcePath);
  const targetPath = c.target.endsWith("/")
    ? path.join(expandHome(c.target), "SKILL.md")
    : expandHome(c.target);
  ensureDir(targetPath);
  fs.writeFileSync(targetPath, content, "utf8");
  return { kind: "installed", component: c.id, message: `escrito em ${targetPath}` };
}

async function installClaudeAgent(c: SdkComponent): Promise<InstallResult> {
  if (!c.source || !c.target) {
    return { kind: "skipped", component: c.id, reason: "source/target ausente" };
  }
  const content = await githubFetchRaw(SDK_REPO_OWNER, SDK_REPO_NAME, c.source);
  const targetPath = expandHome(c.target);
  ensureDir(targetPath);
  fs.writeFileSync(targetPath, content, "utf8");
  return { kind: "installed", component: c.id, message: `escrito em ${targetPath}` };
}

// MCP é um JSON que precisa ser mesclado em ~/.claude/.mcp.json (ou config equivalente)
// preservando entries existentes que o user já configurou manualmente.
async function installClaudeMcp(c: SdkComponent): Promise<InstallResult> {
  if (!c.source || !c.target) {
    return { kind: "skipped", component: c.id, reason: "source/target ausente" };
  }
  const remoteRaw = await githubFetchRaw(SDK_REPO_OWNER, SDK_REPO_NAME, c.source);
  let remoteJson: Record<string, unknown>;
  try {
    remoteJson = JSON.parse(remoteRaw);
  } catch (e) {
    return {
      kind: "error",
      component: c.id,
      error: `JSON remoto inválido: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const targetPath = expandHome(c.target);
  let existing: Record<string, unknown> = { mcpServers: {} };
  if (fs.existsSync(targetPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    } catch {
      // Arquivo corrompido — sobrescreve só com a entry nova (preserva backup)
      fs.copyFileSync(targetPath, `${targetPath}.bak-${Date.now()}`);
      existing = { mcpServers: {} };
    }
  }

  const existingServers = (existing.mcpServers as Record<string, unknown>) ?? {};
  const remoteServers = (remoteJson.mcpServers as Record<string, unknown>) ?? remoteJson;
  const merged = {
    ...existing,
    mcpServers: { ...existingServers, ...remoteServers },
  };

  ensureDir(targetPath);
  fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), "utf8");
  return {
    kind: "installed",
    component: c.id,
    message: `MCP ${c.name} mesclado em ${targetPath}`,
  };
}

async function installObsidianVault(c: SdkComponent): Promise<InstallResult> {
  if (!c.source || !c.target) {
    return { kind: "skipped", component: c.id, reason: "source (URL git) / target ausente" };
  }
  const target = expandHome(c.target);

  if (fs.existsSync(path.join(target, ".git"))) {
    // Já clonado — faz pull pra atualizar
    try {
      await execFileAsync("git", ["pull", "--ff-only"], { cwd: target, timeout: 30_000 });
      return { kind: "installed", component: c.id, message: "vault atualizado (git pull)" };
    } catch (e) {
      return {
        kind: "error",
        component: c.id,
        error: `git pull falhou: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  // Não clonado — clona agora
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    return {
      kind: "skipped",
      component: c.id,
      reason: `destino ${target} já existe e não é vazio (sem .git) — pula pra não destruir`,
    };
  }
  ensureDir(path.join(target, ".keep"));
  try {
    await execFileAsync("git", ["clone", c.source, target], { timeout: 120_000 });
    return { kind: "installed", component: c.id, message: `vault clonado em ${target}` };
  } catch (e) {
    return {
      kind: "error",
      component: c.id,
      error: `git clone falhou: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
