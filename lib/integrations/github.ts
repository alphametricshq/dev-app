import { upsertGithubContributions, type GithubContribDay } from "@/lib/db/queries";

const GH_GRAPHQL = "https://api.github.com/graphql";

type ContribResponse = {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: {
            contributionDays: {
              date: string;
              contributionCount: number;
              contributionLevel: "NONE" | "FIRST_QUARTILE" | "SECOND_QUARTILE" | "THIRD_QUARTILE" | "FOURTH_QUARTILE";
            }[];
          }[];
        };
      };
    };
  };
  errors?: { message: string }[];
};

const LEVEL_MAP: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export async function fetchGithubContributions(opts?: {
  username?: string;
  token?: string;
  from?: Date;
  to?: Date;
}): Promise<{ days: GithubContribDay[]; total: number }> {
  const username = opts?.username ?? process.env.GITHUB_USERNAME;
  const token = opts?.token ?? process.env.GITHUB_TOKEN;
  if (!username) throw new Error("GITHUB_USERNAME ausente");
  if (!token) throw new Error("GITHUB_TOKEN ausente");

  const to = opts?.to ?? new Date();
  const from = opts?.from ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(GH_GRAPHQL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "dashboard-pessoal",
    },
    body: JSON.stringify({
      query,
      variables: { login: username, from: from.toISOString(), to: to.toISOString() },
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as ContribResponse;
  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("Resposta GitHub inválida");

  const days: GithubContribDay[] = cal.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      level: LEVEL_MAP[d.contributionLevel] ?? 0,
    }))
  );

  return { days, total: cal.totalContributions };
}

export async function syncGithub(): Promise<{ itemsSynced: number; total: number }> {
  const { days, total } = await fetchGithubContributions();
  await upsertGithubContributions(days);
  return { itemsSynced: days.length, total };
}
