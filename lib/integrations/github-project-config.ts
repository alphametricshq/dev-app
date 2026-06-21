import { getSetting, setSetting } from "@/lib/db/queries";

const SETTING_KEY = "github_project";

export type ProjectConfig = {
  org: string;
  projectNumber: number;
};

const DEFAULT_CONFIG: ProjectConfig = {
  org: "alphametricshq",
  projectNumber: 1,
};

export async function getProjectConfig(): Promise<ProjectConfig> {
  const raw = await getSetting(SETTING_KEY);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    const p = JSON.parse(raw) as Partial<ProjectConfig>;
    return {
      org: p.org || DEFAULT_CONFIG.org,
      projectNumber:
        typeof p.projectNumber === "number" ? p.projectNumber : DEFAULT_CONFIG.projectNumber,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function setProjectConfig(cfg: ProjectConfig): Promise<void> {
  await setSetting(SETTING_KEY, JSON.stringify(cfg));
}
