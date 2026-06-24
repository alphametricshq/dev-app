import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { githubFetchRaw } from "@/lib/integrations/github-token";
import { SDK_REPO_OWNER, SDK_REPO_NAME } from "./manifest-source";
import type { SdkComponent, SdkSource } from "./types";

const execFileAsync = promisify(execFile);

export type InstallResult =
  | { kind: "installed"; component: string; message?: string }
  | { kind: "skipped"; component: string; reason: string }
  | { kind: "external-action-needed"; component: string; url: string }
  | { kind: "missing-placeholder"; component: string; placeholder: string }
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

// Resolve uma SdkSource pra (owner, repo, path, ref) — string vira
// path relativo dentro de alphametricshq/sdk-devs.
function resolveSource(source: SdkSource): { owner: string; repo: string; path: string; ref: string } {
  if (typeof source === "string") {
    return { owner: SDK_REPO_OWNER, repo: SDK_REPO_NAME, path: source, ref: "main" };
  }
  const [owner, repo] = source.repo.split("/");
  if (!owner || !repo) {
    throw new Error(`source.repo invalido: "${source.repo}" — esperado "owner/repo"`);
  }
  return { owner, repo, path: source.path, ref: source.ref ?? "main" };
}

// Substitui {{PLACEHOLDER}} pelo valor fornecido. Se algum placeholder
// declarado pelo componente nao tem valor, retorna { missing: [...] }.
function applyPlaceholders(
  content: string,
  component: SdkComponent,
  values: Record<string, string>,
): { content: string; missing: string[] } {
  const declared = Object.keys(component.placeholders ?? {});
  const missing: string[] = [];
  let result = content;
  for (const name of declared) {
    const value = values[name];
    if (value == null || value === "") {
      // So flag como faltando se o template realmente contem o placeholder
      if (new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`).test(content)) {
        missing.push(name);
      }
      continue;
    }
    result = result.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, "g"), value);
  }
  return { content: result, missing };
}

/**
 * Instala (ou atualiza) um único componente, idempotente.
 * Aceita valores de placeholders pra substituir antes de gravar.
 */
export async function installComponent(
  c: SdkComponent,
  placeholderValues: Record<string, string> = {},
): Promise<InstallResult> {
  try {
    switch (c.type) {
      case "claude-skill":
        return await installClaudeSkill(c, placeholderValues);
      case "claude-agent":
        return await installClaudeAgent(c, placeholderValues);
      case "claude-mcp":
        return await installClaudeMcp(c, placeholderValues);
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

async function installClaudeSkill(
  c: SdkComponent,
  placeholderValues: Record<string, string>,
): Promise<InstallResult> {
  if (!c.source || !c.target) {
    return { kind: "skipped", component: c.id, reason: "source/target ausente" };
  }
  const src = resolveSource(c.source);
  // source pode terminar em "/" — busca SKILL.md dentro
  const srcPath = src.path.endsWith("/") ? `${src.path}SKILL.md` : src.path;
  const content = await githubFetchRaw(src.owner, src.repo, srcPath, src.ref);
  const { content: applied, missing } = applyPlaceholders(content, c, placeholderValues);
  if (missing.length > 0) {
    return { kind: "missing-placeholder", component: c.id, placeholder: missing[0] };
  }
  const targetPath = c.target.endsWith("/")
    ? path.join(expandHome(c.target), "SKILL.md")
    : expandHome(c.target);
  ensureDir(targetPath);
  fs.writeFileSync(targetPath, applied, "utf8");
  return { kind: "installed", component: c.id, message: `escrito em ${targetPath}` };
}

async function installClaudeAgent(
  c: SdkComponent,
  placeholderValues: Record<string, string>,
): Promise<InstallResult> {
  if (!c.source || !c.target) {
    return { kind: "skipped", component: c.id, reason: "source/target ausente" };
  }
  const src = resolveSource(c.source);
  const content = await githubFetchRaw(src.owner, src.repo, src.path, src.ref);
  const { content: applied, missing } = applyPlaceholders(content, c, placeholderValues);
  if (missing.length > 0) {
    return { kind: "missing-placeholder", component: c.id, placeholder: missing[0] };
  }
  const targetPath = expandHome(c.target);
  ensureDir(targetPath);
  fs.writeFileSync(targetPath, applied, "utf8");
  return { kind: "installed", component: c.id, message: `escrito em ${targetPath}` };
}

async function installClaudeMcp(
  c: SdkComponent,
  placeholderValues: Record<string, string>,
): Promise<InstallResult> {
  if (!c.source || !c.target) {
    return { kind: "skipped", component: c.id, reason: "source/target ausente" };
  }
  const src = resolveSource(c.source);
  const remoteRaw = await githubFetchRaw(src.owner, src.repo, src.path, src.ref);

  // Substitui placeholders no template ANTES de parsear (token vai dentro de string JSON)
  const { content: applied, missing } = applyPlaceholders(remoteRaw, c, placeholderValues);
  if (missing.length > 0) {
    return { kind: "missing-placeholder", component: c.id, placeholder: missing[0] };
  }

  let remoteJson: Record<string, unknown>;
  try {
    remoteJson = JSON.parse(applied);
  } catch (e) {
    return {
      kind: "error",
      component: c.id,
      error: `JSON remoto invalido (apos placeholders): ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const targetPath = expandHome(c.target);
  let existing: Record<string, unknown> = { mcpServers: {} };
  if (fs.existsSync(targetPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    } catch {
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
    return { kind: "skipped", component: c.id, reason: "source / target ausente" };
  }
  // Pra vault o source eh URL git completa, nao path
  const gitUrl = typeof c.source === "string" ? c.source : `https://github.com/${c.source.repo}.git`;
  const target = expandHome(c.target);

  if (fs.existsSync(path.join(target, ".git"))) {
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

  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    return {
      kind: "skipped",
      component: c.id,
      reason: `destino ${target} ja existe e nao e vazio (sem .git) — pula pra nao destruir`,
    };
  }
  ensureDir(path.join(target, ".keep"));
  try {
    await execFileAsync("git", ["clone", gitUrl, target], { timeout: 120_000 });
    return { kind: "installed", component: c.id, message: `vault clonado em ${target}` };
  } catch (e) {
    return {
      kind: "error",
      component: c.id,
      error: `git clone falhou: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
