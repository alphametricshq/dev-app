// Tipos do SDK Alphametrics — schema do manifest.json e estado detectado local.
// O manifest mora num repo separado (alphametricshq/sdk-devs) e descreve o que
// um funcionario precisa ter instalado pra trabalhar: skills/agents/MCPs do
// Claude Code, vaults do Obsidian, executaveis externos (Git, Obsidian app etc).

export type SdkComponentType =
  | "claude-skill"      // ~/.claude/skills/<name>/SKILL.md
  | "claude-agent"      // ~/.claude/agents/<name>.md
  | "claude-mcp"        // merge em ~/.claude/.mcp.json (ou config equivalente)
  | "obsidian-vault"    // clone/copia pra pasta de vaults do Obsidian
  | "external-app";     // executavel externo: Git, Obsidian app, Claude Code CLI

export type SdkComponent = {
  id: string;                       // estavel, ex "skill-iniciar-demanda"
  type: SdkComponentType;
  name: string;                     // display + nome do diretorio/arquivo final
  version: string;                  // semver
  description: string;              // mostrado na UI
  source?: string;                  // caminho relativo dentro do repo SDK
  target?: string;                  // destino na maquina (com ~ pra home)
  required?: boolean;               // se true, fica sempre marcado na lista
  // Pra external-app: como checar instalado (which/where, registry, etc)
  detect?: {
    kind: "file" | "command" | "frontmatter-version";
    command?: string;               // ex "claude --version"
    path?: string;                  // ex "~/.claude/skills/iniciar-demanda/SKILL.md"
    versionRegex?: string;          // captura grupo 1 = versao
  };
  // Pra external-app: link de download (quando o SDK nao consegue instalar sozinho)
  installUrl?: string;
};

export type SdkManifest = {
  version: string;                  // semver do proprio SDK
  updatedAt: string;                // ISO datetime
  repo: string;                     // "alphametricshq/sdk-devs"
  components: SdkComponent[];
};

// Estado detectado de um componente na maquina local
export type ComponentState =
  | { kind: "not-installed" }
  | { kind: "installed"; version: string; matchesRemote: boolean }
  | { kind: "outdated"; localVersion: string }
  | { kind: "modified"; version: string }     // mesma versao mas hash diferente
  | { kind: "unknown"; reason: string };      // erro ao detectar

export type DetectedComponent = SdkComponent & {
  state: ComponentState;
};

export type SdkState = {
  manifest: SdkManifest;
  components: DetectedComponent[];
  scannedAt: string;
};
