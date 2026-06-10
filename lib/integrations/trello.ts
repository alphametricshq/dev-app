import { upsertTrelloCompletedTasks, type TrelloTaskInsert } from "@/lib/db/queries";
import { getCredential } from "@/lib/credentials/store";
import { isDoneListName } from "@/lib/trello-hints";

const TRELLO_API = "https://api.trello.com/1";

type TrelloBoard = { id: string; name: string; closed: boolean };
type TrelloList = { id: string; name: string; idBoard: string; closed: boolean };
type TrelloCard = { id: string; name: string; url: string; idBoard: string; idList: string; dateLastActivity: string; closed: boolean; dueComplete?: boolean };
type TrelloAction = {
  id: string;
  type: string;
  date: string;
  data: {
    card?: { id: string; name: string };
    board?: { id: string; name: string };
    list?: { id: string; name: string };
    listAfter?: { id: string; name: string };
    listBefore?: { id: string; name: string };
    old?: { idList?: string };
  };
};

function auth() {
  const key = getCredential("TRELLO_API_KEY");
  const token = getCredential("TRELLO_TOKEN");
  if (!key || !token) throw new Error("TRELLO_API_KEY ou TRELLO_TOKEN ausentes");
  return { key, token };
}

async function trelloFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const { key, token } = auth();
  const url = new URL(`${TRELLO_API}${path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), { headers: { "User-Agent": "dashboard-pessoal" } });
  if (!res.ok) {
    throw new Error(`Trello API ${res.status} (${path}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function getMyBoards(): Promise<TrelloBoard[]> {
  const all = await trelloFetch<TrelloBoard[]>("/members/me/boards", { fields: "id,name,closed", filter: "open" });
  return all.filter((b) => !b.closed);
}

export async function getBoardLists(boardId: string): Promise<TrelloList[]> {
  return trelloFetch<TrelloList[]>(`/boards/${boardId}/lists`, { fields: "id,name,idBoard,closed", filter: "open" });
}

async function resolveDoneListIds(): Promise<{ id: string; name: string; boardId: string; boardName: string }[]> {
  const explicit = getCredential("TRELLO_DONE_LIST_IDS")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const boards = await getMyBoards();
  const result: { id: string; name: string; boardId: string; boardName: string }[] = [];

  for (const board of boards) {
    const lists = await getBoardLists(board.id);
    for (const list of lists) {
      const matchExplicit = explicit.includes(list.id);
      const matchAuto = explicit.length === 0 && isDoneListName(list.name);
      if (matchExplicit || matchAuto) {
        result.push({ id: list.id, name: list.name, boardId: board.id, boardName: board.name });
      }
    }
  }
  return result;
}

export async function fetchCompletedActions(sinceDays = 90): Promise<{ tasks: TrelloTaskInsert[]; meta: { boards: number; doneLists: number } }> {
  const doneLists = await resolveDoneListIds();
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const doneIdSet = new Set(doneLists.map((l) => l.id));
  const boardsByList = new Map(doneLists.map((l) => [l.id, l]));
  const boardIds = Array.from(new Set(doneLists.map((l) => l.boardId)));

  const tasks: TrelloTaskInsert[] = [];
  const seen = new Set<string>();

  // 1) Card movements para listas Done (histórico)
  for (const boardId of boardIds) {
    const actions = await trelloFetch<TrelloAction[]>(`/boards/${boardId}/actions`, {
      filter: "updateCard",
      since,
      limit: 1000,
    });
    for (const a of actions) {
      const after = a.data.listAfter;
      if (!after || !doneIdSet.has(after.id)) continue;
      const cardId = a.data.card?.id;
      const cardName = a.data.card?.name;
      if (!cardId || !cardName) continue;
      const ctx = boardsByList.get(after.id)!;
      const id = `move:${a.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      tasks.push({
        id,
        card_id: cardId,
        card_name: cardName,
        board_id: boardId,
        board_name: a.data.board?.name ?? ctx.boardName,
        list_id: after.id,
        list_name: after.name,
        completed_at: a.date,
        url: `https://trello.com/c/${cardId}`,
        raw_action_id: a.id,
      });
    }
  }

  // 2) Cards atualmente nas listas Done (caso tenham sido criados direto lá ou movidos antes do `since`)
  for (const list of doneLists) {
    const cards = await trelloFetch<TrelloCard[]>(`/lists/${list.id}/cards`, {
      fields: "id,name,url,idBoard,idList,dateLastActivity,closed",
    });
    for (const c of cards) {
      if (c.closed) continue;
      const id = `current:${c.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      tasks.push({
        id,
        card_id: c.id,
        card_name: c.name,
        board_id: c.idBoard,
        board_name: list.boardName,
        list_id: c.idList,
        list_name: list.name,
        completed_at: c.dateLastActivity,
        url: c.url,
      });
    }
  }

  return { tasks, meta: { boards: boardIds.length, doneLists: doneLists.length } };
}

export async function syncTrello(sinceDays = 90): Promise<{ itemsSynced: number; meta: { boards: number; doneLists: number } }> {
  const { tasks, meta } = await fetchCompletedActions(sinceDays);
  await upsertTrelloCompletedTasks(tasks);
  return { itemsSynced: tasks.length, meta };
}
