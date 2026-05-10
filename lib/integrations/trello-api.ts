import { getCredential } from "@/lib/credentials/store";

const TRELLO_API = "https://api.trello.com/1";

export type TrelloBoardSummary = { id: string; name: string };
export type TrelloListItem = { id: string; name: string; idBoard: string; closed: boolean; pos: number };
// Cores possíveis: red, orange, yellow, green, blue, purple, pink, sky, lime, black, null
export type TrelloLabelColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "sky"
  | "lime"
  | "black"
  | null;
export type TrelloLabel = { id: string; idBoard: string; name: string; color: TrelloLabelColor };
export type TrelloCardItem = {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idBoard: string;
  pos: number;
  url: string;
  due: string | null;
  dueComplete: boolean;
  closed: boolean;
  idLabels: string[];
  labels: TrelloLabel[];
};
export type TrelloBoardFull = {
  id: string;
  name: string;
  lists: TrelloListItem[];
  cards: TrelloCardItem[];
  labels: TrelloLabel[];
};

function auth() {
  const key = getCredential("TRELLO_API_KEY");
  const token = getCredential("TRELLO_TOKEN");
  if (!key || !token) throw new Error("TRELLO_API_KEY ou TRELLO_TOKEN ausentes");
  return { key, token };
}

async function call<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const { key, token } = auth();
  const url = new URL(`${TRELLO_API}${path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    method,
    headers: { "User-Agent": "dashboard-pessoal", Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello ${method} ${path} ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ============== Boards ==============

export function getMyBoards(): Promise<TrelloBoardSummary[]> {
  return call<TrelloBoardSummary[]>("GET", "/members/me/boards", {
    fields: "id,name,closed",
    filter: "open",
  }).then((boards) => boards.map((b) => ({ id: b.id, name: b.name })));
}

export async function getBoardFull(boardId: string): Promise<TrelloBoardFull> {
  const [board, lists, cards, labels] = await Promise.all([
    call<{ id: string; name: string }>("GET", `/boards/${boardId}`, { fields: "id,name" }),
    call<TrelloListItem[]>("GET", `/boards/${boardId}/lists`, {
      fields: "id,name,idBoard,closed,pos",
      filter: "open",
    }),
    call<TrelloCardItem[]>("GET", `/boards/${boardId}/cards`, {
      fields: "id,name,desc,idList,idBoard,pos,url,due,dueComplete,closed,idLabels,labels",
      filter: "open",
    }),
    call<TrelloLabel[]>("GET", `/boards/${boardId}/labels`, {
      fields: "id,idBoard,name,color",
      limit: 1000,
    }),
  ]);
  return { id: board.id, name: board.name, lists, cards, labels };
}

// ============== Cards ==============

export function createCard(input: { idList: string; name: string; desc?: string; pos?: number | "top" | "bottom" }) {
  return call<TrelloCardItem>("POST", "/cards", {
    idList: input.idList,
    name: input.name,
    desc: input.desc ?? "",
    pos: input.pos ?? "bottom",
  });
}

export function updateCard(
  cardId: string,
  input: { name?: string; desc?: string; idList?: string; pos?: number | "top" | "bottom"; closed?: boolean },
) {
  return call<TrelloCardItem>("PUT", `/cards/${cardId}`, input);
}

export function deleteCard(cardId: string) {
  return call<void>("DELETE", `/cards/${cardId}`);
}

// ============== Checklists ==============

export type TrelloCheckItem = {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  pos: number;
};

export type TrelloChecklist = {
  id: string;
  name: string;
  idCard: string;
  pos: number;
  checkItems: TrelloCheckItem[];
};

export function getChecklistsForCard(cardId: string): Promise<TrelloChecklist[]> {
  return call<TrelloChecklist[]>("GET", `/cards/${cardId}/checklists`, {
    checkItems: "all",
    checkItem_fields: "name,state,pos",
    fields: "id,name,idCard,pos",
  });
}

export function createChecklist(input: { idCard: string; name: string }) {
  return call<TrelloChecklist>("POST", "/checklists", {
    idCard: input.idCard,
    name: input.name,
  });
}

export function deleteChecklist(checklistId: string) {
  return call<void>("DELETE", `/checklists/${checklistId}`);
}

export function createCheckItem(checklistId: string, input: { name: string; pos?: "top" | "bottom" }) {
  return call<TrelloCheckItem>("POST", `/checklists/${checklistId}/checkItems`, {
    name: input.name,
    pos: input.pos ?? "bottom",
  });
}

export function updateCheckItem(
  cardId: string,
  checkItemId: string,
  input: { state?: "complete" | "incomplete"; name?: string },
) {
  return call<TrelloCheckItem>(
    "PUT",
    `/cards/${cardId}/checkItem/${checkItemId}`,
    input,
  );
}

export function deleteCheckItem(checklistId: string, itemId: string) {
  return call<void>("DELETE", `/checklists/${checklistId}/checkItems/${itemId}`);
}

// ============== Search ==============

export type TrelloSearchCard = {
  id: string;
  name: string;
  idBoard: string;
  idList: string;
  url: string;
  closed: boolean;
};

export async function searchCards(query: string): Promise<TrelloSearchCard[]> {
  if (!query.trim()) return [];
  const r = await call<{ cards?: TrelloSearchCard[] }>("GET", "/search", {
    query: query.trim(),
    modelTypes: "cards",
    card_fields: "name,idBoard,idList,url,closed",
    cards_limit: 15,
  });
  return (r.cards ?? []).filter((c) => !c.closed);
}

// ============== Lists ==============

export function createList(input: { idBoard: string; name: string; pos?: number | "top" | "bottom" }) {
  return call<TrelloListItem>("POST", "/lists", {
    idBoard: input.idBoard,
    name: input.name,
    pos: input.pos ?? "bottom",
  });
}

export function updateList(
  listId: string,
  input: { name?: string; closed?: boolean; pos?: number | "top" | "bottom" },
) {
  return call<TrelloListItem>("PUT", `/lists/${listId}`, input);
}
