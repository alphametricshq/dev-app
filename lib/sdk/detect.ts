import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ComponentState, SdkComponent } from "./types";

const execFileAsync = promisify(execFile);

function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  if (p === "~") return os.homedir();
  return p;
}

function compareSemver(a: string, b: string): number {
  // Comparacao simples major.minor.patch — ignora pre-release. Suficiente
  // pra "instalado < remote" no MVP. Tags tipo "1.0.0-mock" caem aqui.
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function readFrontmatterVersion(filePath: string): string | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    // Frontmatter no formato YAML entre --- --- no topo
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!m) return null;
    const v = m[1].match(/^\s*version\s*:\s*['"]?([^\s'"\n]+)['"]?/m);
    return v?.[1] ?? null;
  } catch {
    return null;
  }
}

async function runCommand(cmd: string): Promise<string | null> {
  // Quebra simples por espaco — comandos do detect sao curtos e controlados
  // pelo manifest (que vive em repo da org, nao input de usuario).
  const parts = cmd.split(/\s+/);
  const exec = parts[0];
  const args = parts.slice(1);
  try {
    const { stdout, stderr } = await execFileAsync(exec, args, {
      timeout: 5000,
      shell: false,
    });
    return (stdout || stderr || "").toString().trim();
  } catch {
    return null;
  }
}

export async function detectComponent(c: SdkComponent): Promise<ComponentState> {
  if (!c.detect) return { kind: "unknown", reason: "manifest sem campo detect" };

  if (c.detect.kind === "frontmatter-version") {
    const p = c.detect.path ? expandHome(c.detect.path) : null;
    if (!p) return { kind: "unknown", reason: "path ausente" };
    if (!fs.existsSync(p)) return { kind: "not-installed" };
    const localVersion = readFrontmatterVersion(p);
    if (!localVersion) {
      // Frontmatter padrao do Claude Code nao tem `version:` — quando o arquivo
      // existe mas o campo nao esta presente, tratamos como "instalado" (assume
      // a versao do manifest). Evita alarme falso "modificado localmente" em
      // 86 skills + 7 agents que estao no formato padrao.
      return { kind: "installed", version: c.version, matchesRemote: true };
    }
    const cmp = compareSemver(localVersion, c.version);
    if (cmp < 0) return { kind: "outdated", localVersion };
    return { kind: "installed", version: localVersion, matchesRemote: cmp === 0 };
  }

  if (c.detect.kind === "file") {
    const p = c.detect.path ? expandHome(c.detect.path) : null;
    if (!p) return { kind: "unknown", reason: "path ausente" };
    if (fs.existsSync(p)) {
      return { kind: "installed", version: c.version, matchesRemote: true };
    }
    return { kind: "not-installed" };
  }

  if (c.detect.kind === "command") {
    if (!c.detect.command) return { kind: "unknown", reason: "command ausente" };
    const out = await runCommand(c.detect.command);
    if (out == null) return { kind: "not-installed" };
    if (c.detect.versionRegex) {
      try {
        const re = new RegExp(c.detect.versionRegex);
        const m = out.match(re);
        if (m?.[1]) {
          return { kind: "installed", version: m[1], matchesRemote: true };
        }
      } catch {
        // regex invalido — trata como instalado sem versao reconhecida
      }
    }
    return { kind: "installed", version: "?", matchesRemote: true };
  }

  return { kind: "unknown", reason: `detect.kind nao suportado: ${c.detect.kind}` };
}

export async function detectAll(components: SdkComponent[]) {
  // Roda em paralelo — cada detect eh independente (filesystem ou processo curto).
  return Promise.all(
    components.map(async (c) => ({ ...c, state: await detectComponent(c) })),
  );
}
