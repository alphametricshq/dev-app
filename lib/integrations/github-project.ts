import { getCredential } from "@/lib/credentials/store";

const GH_GRAPHQL = "https://api.github.com/graphql";

export type ProjectItem = {
  itemId: string;
  title: string;
  url: string | null;
  number: number | null;
  repoFullName: string | null;
  status: string | null;
  state: string | null; // OPEN/CLOSED do issue (null pra draft)
  assignees: string[];
};

type GqlContent = {
  title?: string;
  number?: number;
  url?: string;
  state?: string;
  assignees?: { nodes: { login: string }[] };
  repository?: { nameWithOwner: string };
};

type GqlFieldValue = {
  name?: string;
  field?: { name?: string };
};

type GqlItem = {
  id: string;
  content: GqlContent | null;
  fieldValues: { nodes: GqlFieldValue[] };
};

type GqlResponse = {
  data?: {
    organization?: {
      projectV2?: {
        items: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: GqlItem[];
        };
      } | null;
    } | null;
  };
  errors?: { message: string }[];
};

const QUERY = `
query($org: String!, $num: Int!, $cursor: String) {
  organization(login: $org) {
    projectV2(number: $num) {
      items(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on Issue { title number url state assignees(first: 10) { nodes { login } } repository { nameWithOwner } }
            ... on PullRequest { title number url state assignees(first: 10) { nodes { login } } repository { nameWithOwner } }
            ... on DraftIssue { title assignees(first: 10) { nodes { login } } }
          }
          fieldValues(first: 30) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
        }
      }
    }
  }
}
`;

export async function fetchProjectItems(org: string, projectNumber: number): Promise<ProjectItem[]> {
  const token = getCredential("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN ausente");

  const items: ProjectItem[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 10; page++) {
    const res: Response = await fetch(GH_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "dashboard-pessoal",
      },
      body: JSON.stringify({ query: QUERY, variables: { org, num: projectNumber, cursor } }),
    });
    if (!res.ok) throw new Error(`GitHub Project ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as GqlResponse;
    if (json.errors?.length) {
      throw new Error(`GitHub GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
    }
    const proj = json.data?.organization?.projectV2;
    if (!proj) throw new Error("Project não encontrado ou sem acesso");

    for (const node of proj.items.nodes) {
      const c = node.content;
      if (!c) continue;
      const statusVal = node.fieldValues.nodes.find((fv) => fv.field?.name === "Status");
      items.push({
        itemId: node.id,
        title: c.title ?? "(sem título)",
        url: c.url ?? null,
        number: c.number ?? null,
        repoFullName: c.repository?.nameWithOwner ?? null,
        status: statusVal?.name ?? null,
        state: c.state ?? null,
        assignees: (c.assignees?.nodes ?? []).map((a) => a.login),
      });
    }

    if (!proj.items.pageInfo.hasNextPage) break;
    cursor = proj.items.pageInfo.endCursor;
  }

  return items;
}
