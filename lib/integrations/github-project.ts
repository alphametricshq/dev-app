import { projectGraphql } from "@/lib/integrations/github-token";

export type ProjectItem = {
  itemId: string;
  title: string;
  url: string | null;
  number: number | null;
  repoFullName: string | null;
  status: string | null;
  state: string | null; // OPEN/CLOSED do issue (null pra draft)
  assignees: string[];
  cliente: string | null;
  prioridade: string | null;
  tipo: string | null;
  deadline: string | null; // ISO yyyy-mm-dd
  isDraft: boolean;
};

export type ProjectStatusOption = { id: string; name: string };

export type ProjectMeta = {
  projectId: string;
  title: string;
  statusFieldId: string;
  statusOptions: ProjectStatusOption[];
};

type GqlContent = {
  __typename?: string;
  title?: string;
  number?: number;
  url?: string;
  state?: string;
  assignees?: { nodes: { login: string }[] };
  repository?: { nameWithOwner: string };
};

type GqlFieldValue = {
  name?: string; // single select
  date?: string; // date field
  field?: { name?: string };
};

type GqlItem = {
  id: string;
  content: GqlContent | null;
  fieldValues: { nodes: GqlFieldValue[] };
};

type ItemsData = {
  organization?: {
    projectV2?: {
      items: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: GqlItem[];
      };
    } | null;
  } | null;
};

type MetaData = {
  organization?: {
    projectV2?: {
      id: string;
      title: string;
      field?: {
        id: string;
        options: { id: string; name: string }[];
      } | null;
    } | null;
  } | null;
};

const ITEMS_QUERY = `
query($org: String!, $num: Int!, $cursor: String) {
  organization(login: $org) {
    projectV2(number: $num) {
      items(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            __typename
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
              ... on ProjectV2ItemFieldDateValue {
                date
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

const META_QUERY = `
query($org: String!, $num: Int!) {
  organization(login: $org) {
    projectV2(number: $num) {
      id
      title
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
}
`;

const MOVE_MUTATION = `
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId,
    itemId: $itemId,
    fieldId: $fieldId,
    value: { singleSelectOptionId: $optionId }
  }) {
    projectV2Item { id }
  }
}
`;

function fieldValue(nodes: GqlFieldValue[], fieldName: string): GqlFieldValue | undefined {
  return nodes.find((fv) => fv.field?.name === fieldName);
}

export async function fetchProjectItems(org: string, projectNumber: number): Promise<ProjectItem[]> {
  const items: ProjectItem[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 10; page++) {
    const data: ItemsData = await projectGraphql<ItemsData>(ITEMS_QUERY, {
      org,
      num: projectNumber,
      cursor,
    });
    const proj = data.organization?.projectV2;
    if (!proj) throw new Error("Project não encontrado ou sem acesso");

    for (const node of proj.items.nodes) {
      const c = node.content;
      if (!c) continue;
      const fv = node.fieldValues.nodes;
      items.push({
        itemId: node.id,
        title: c.title ?? "(sem título)",
        url: c.url ?? null,
        number: c.number ?? null,
        repoFullName: c.repository?.nameWithOwner ?? null,
        status: fieldValue(fv, "Status")?.name ?? null,
        state: c.state ?? null,
        assignees: (c.assignees?.nodes ?? []).map((a) => a.login),
        cliente: fieldValue(fv, "Cliente")?.name ?? null,
        prioridade: fieldValue(fv, "Prioridade")?.name ?? null,
        tipo: fieldValue(fv, "Tipo")?.name ?? null,
        deadline: fieldValue(fv, "Deadline")?.date ?? null,
        isDraft: c.__typename === "DraftIssue",
      });
    }

    if (!proj.items.pageInfo.hasNextPage) break;
    cursor = proj.items.pageInfo.endCursor;
  }

  return items;
}

export async function fetchProjectMeta(org: string, projectNumber: number): Promise<ProjectMeta> {
  const data = await projectGraphql<MetaData>(META_QUERY, { org, num: projectNumber });
  const proj = data.organization?.projectV2;
  if (!proj) throw new Error("Project não encontrado ou sem acesso");
  if (!proj.field) throw new Error('Campo "Status" não encontrado no Project');
  return {
    projectId: proj.id,
    title: proj.title,
    statusFieldId: proj.field.id,
    statusOptions: proj.field.options,
  };
}

export async function moveProjectItem(input: {
  projectId: string;
  itemId: string;
  fieldId: string;
  optionId: string;
}): Promise<void> {
  await projectGraphql(MOVE_MUTATION, {
    projectId: input.projectId,
    itemId: input.itemId,
    fieldId: input.fieldId,
    optionId: input.optionId,
  });
}
