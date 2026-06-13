"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { EntryEditor } from "./entry-editor";
import { confirmDialog } from "@/lib/dialogs";
import type { JournalEntry } from "@/lib/db/journal-queries";

export function EntryCard({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: JournalEntry;
  onUpdate: (id: number, data: { content: string; tags: string[]; mood: string; energy: number }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EntryEditor
        initialContent={entry.content}
        initialTags={entry.tags}
        initialMood={entry.mood}
        initialEnergy={entry.energy}
        submitLabel="Atualizar"
        autoFocus
        onCancel={() => setEditing(false)}
        onSubmit={async (data) => {
          await onUpdate(entry.id, data);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <article className="group card relative">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {entry.mood && <span className="text-base">{entry.mood}</span>}
          {entry.energy > 0 && (
            <span
              className="flex items-center gap-0.5 text-[10px] text-warning"
              title={`Energia ${entry.energy}/5`}
            >
              ⚡{entry.energy}
            </span>
          )}
          <time className="text-[11px] text-fg-subtle">
            {formatDateTime(entry.created_at)}
            {entry.updated_at !== entry.created_at && (
              <span className="ml-1.5 italic">· editado</span>
            )}
          </time>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1 text-fg-subtle hover:bg-bg-hover hover:text-fg"
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Apagar essa nota?",
                confirmLabel: "Apagar",
                danger: true,
              });
              if (ok) onDelete(entry.id);
            }}
            className="rounded p-1 text-fg-subtle hover:bg-danger/20 hover:text-danger"
            aria-label="Apagar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="whitespace-pre-wrap break-words text-sm text-fg">{entry.content}</div>

      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] text-fg-muted"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso + "Z");
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Hoje às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
