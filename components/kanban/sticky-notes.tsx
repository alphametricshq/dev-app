"use client";

import { useEffect, useRef, useState } from "react";
import { StickyNote, X, Plus } from "lucide-react";

type Note = {
  id: string;
  x: number;
  y: number;
  text: string;
};

function storageKey(boardId: string) {
  return `sticky-notes-${boardId}`;
}

function loadNotes(boardId: string): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(boardId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes(boardId: string, notes: Note[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(boardId), JSON.stringify(notes));
  } catch {
    /* ignora */
  }
}

export function StickyNotes({ boardId }: { boardId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    setNotes(loadNotes(boardId));
  }, [boardId]);

  function persist(next: Note[]) {
    setNotes(next);
    saveNotes(boardId, next);
  }

  function addNote() {
    const note: Note = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: 24 + Math.random() * 80,
      y: 80 + Math.random() * 60,
      text: "",
    };
    persist([...notes, note]);
  }

  function updateText(id: string, text: string) {
    persist(notes.map((n) => (n.id === id ? { ...n, text } : n)));
  }

  function remove(id: string) {
    persist(notes.filter((n) => n.id !== id));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>, note: Note) {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    if ((e.target as HTMLElement).closest("button")) return;
    setDraggingId(note.id);
    dragOffset.current = { dx: e.clientX - note.x, dy: e.clientY - note.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingId) return;
    const nx = Math.max(0, e.clientX - dragOffset.current.dx);
    const ny = Math.max(0, e.clientY - dragOffset.current.dy);
    setNotes((prev) =>
      prev.map((n) => (n.id === draggingId ? { ...n, x: nx, y: ny } : n)),
    );
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingId) return;
    setDraggingId(null);
    saveNotes(boardId, notes); // já estão com a posição atualizada
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignora */
    }
  }

  return (
    <>
      <button
        onClick={addNote}
        className="fixed bottom-24 right-6 z-30 flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning shadow-lg transition-colors hover:bg-warning/25"
        title="Adicionar post-it pra esse board"
      >
        <StickyNote className="h-3.5 w-3.5" />
        Nota
      </button>

      {notes.map((note) => (
        <div
          key={note.id}
          onPointerDown={(e) => onPointerDown(e, note)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            position: "fixed",
            left: note.x,
            top: note.y,
            zIndex: 30,
            cursor: draggingId === note.id ? "grabbing" : "grab",
            touchAction: "none",
          }}
          className="group h-44 w-52 rounded-md border border-warning/40 bg-yellow-200/90 p-2 text-yellow-900 shadow-xl"
        >
          <div className="mb-1 flex items-center justify-between">
            <Plus className="h-3 w-3 opacity-40" />
            <button
              onClick={() => remove(note.id)}
              className="rounded p-0.5 opacity-30 hover:bg-yellow-300 hover:opacity-100"
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <textarea
            value={note.text}
            onChange={(e) => updateText(note.id, e.target.value)}
            placeholder="Anota algo..."
            className="h-[calc(100%-1.5rem)] w-full resize-none bg-transparent text-xs leading-snug text-yellow-900 placeholder:text-yellow-700/60 focus:outline-none"
          />
        </div>
      ))}
    </>
  );
}
