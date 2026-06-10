import { getMyBoards, getBoardListsOnly } from "@/lib/integrations/trello-api";
import { isTodoListName } from "@/lib/trello-hints";

/**
 * Acha a primeira lista "To-do" varrendo os boards do usuário.
 * Fallback: primeira lista aberta do primeiro board.
 * Retorna { listId, listName, boardName } ou null se não achar.
 */
export async function findTodoList(): Promise<{ listId: string; listName: string; boardName: string } | null> {
  const boards = await getMyBoards();
  for (const board of boards) {
    const lists = await getBoardListsOnly(board.id);
    const open = [...lists].filter((l) => !l.closed).sort((a, b) => a.pos - b.pos);
    const match = open.find((l) => isTodoListName(l.name));
    if (match) return { listId: match.id, listName: match.name, boardName: board.name };
  }
  // Fallback: primeira lista do primeiro board
  if (boards.length > 0) {
    const lists = await getBoardListsOnly(boards[0].id);
    const open = [...lists].filter((l) => !l.closed).sort((a, b) => a.pos - b.pos);
    if (open.length > 0) {
      return { listId: open[0].id, listName: open[0].name, boardName: boards[0].name };
    }
  }
  return null;
}
