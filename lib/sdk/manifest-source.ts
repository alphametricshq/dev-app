import type { SdkManifest } from "./types";

// Fonte do manifest. Hoje retorna um mock embutido pra UI ja funcionar enquanto
// o repo `alphametricshq/sdk-devs` esta sendo montado.
// Quando o repo existir, trocar `getManifest` por um fetch via GitHub API
// (raw.githubusercontent + token do GITHUB_PROJECT_TOKEN / GITHUB_TOKEN).

const MOCK_MANIFEST: SdkManifest = {
  version: "0.1.0-mock",
  updatedAt: "2026-06-21T00:00:00Z",
  repo: "alphametricshq/sdk-devs",
  components: [
    {
      id: "skill-iniciar-demanda",
      type: "claude-skill",
      name: "iniciar-demanda",
      version: "1.0.0",
      description: "Auto-documenta uma demanda nova que o dev esta comecando a trabalhar.",
      source: "skills/iniciar-demanda/",
      target: "~/.claude/skills/iniciar-demanda/",
      required: true,
      detect: {
        kind: "frontmatter-version",
        path: "~/.claude/skills/iniciar-demanda/SKILL.md",
      },
    },
    {
      id: "skill-criar-handoff",
      type: "claude-skill",
      name: "criar-handoff-alphametrics",
      version: "1.0.0",
      description: "Cria handoff/issue formal pra Yan ou Gabriel.",
      source: "skills/criar-handoff-alphametrics/",
      target: "~/.claude/skills/criar-handoff-alphametrics/",
      required: true,
      detect: {
        kind: "frontmatter-version",
        path: "~/.claude/skills/criar-handoff-alphametrics/SKILL.md",
      },
    },
    {
      id: "agent-secrets-auditor",
      type: "claude-agent",
      name: "secrets-auditor",
      version: "1.0.0",
      description: "Audita credenciais hardcoded antes de commit/push.",
      source: "agents/secrets-auditor.md",
      target: "~/.claude/agents/secrets-auditor.md",
      required: true,
      detect: {
        kind: "frontmatter-version",
        path: "~/.claude/agents/secrets-auditor.md",
      },
    },
    {
      id: "agent-firebird-safety",
      type: "claude-agent",
      name: "firebird-safety-auditor",
      version: "1.0.0",
      description: "Audita escritas em banco Firebird de cliente.",
      source: "agents/firebird-safety-auditor.md",
      target: "~/.claude/agents/firebird-safety-auditor.md",
      detect: {
        kind: "frontmatter-version",
        path: "~/.claude/agents/firebird-safety-auditor.md",
      },
    },
    {
      id: "mcp-supabase",
      type: "claude-mcp",
      name: "supabase",
      version: "1.0.0",
      description: "MCP server pra Supabase (AlphaHub).",
      detect: {
        kind: "file",
        path: "~/.claude/.mcp.json",
      },
    },
    {
      id: "vault-trabalho",
      type: "obsidian-vault",
      name: "obsidian-trabalho",
      version: "1.0.0",
      description: "Vault de trabalho da Alphametrics com notas por cliente.",
      target: "~/Documents/Projetos Programacao/Obsidian",
      detect: {
        kind: "file",
        path: "~/Documents/Projetos Programacao/Obsidian/.obsidian",
      },
    },
    {
      id: "ext-git",
      type: "external-app",
      name: "Git",
      version: "2.0.0+",
      description: "Versionamento. Necessario pra clonar repos da org.",
      required: true,
      detect: {
        kind: "command",
        command: "git --version",
        versionRegex: "git version (\\S+)",
      },
      installUrl: "https://git-scm.com/download/win",
    },
    {
      id: "ext-claude-code",
      type: "external-app",
      name: "Claude Code CLI",
      version: "1.0.0+",
      description: "CLI do Claude Code. Onde as skills e agents rodam.",
      required: true,
      detect: {
        kind: "command",
        command: "claude --version",
        versionRegex: "(\\d+\\.\\d+\\.\\d+)",
      },
      installUrl: "https://docs.claude.com/en/docs/claude-code/quickstart",
    },
    {
      id: "ext-obsidian",
      type: "external-app",
      name: "Obsidian",
      version: "1.0.0+",
      description: "Editor de notas. Necessario pra abrir o vault de trabalho.",
      detect: {
        kind: "command",
        command: "where obsidian",
      },
      installUrl: "https://obsidian.md/download",
    },
  ],
};

export async function getManifest(): Promise<SdkManifest> {
  // TODO: quando alphametricshq/sdk-devs estiver montado, trocar por:
  //   fetch raw.githubusercontent.com/alphametricshq/sdk-devs/main/manifest.json
  //   com Authorization: Bearer <gh-token> (repo eh privado)
  return MOCK_MANIFEST;
}
