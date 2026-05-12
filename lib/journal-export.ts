"use client";

import type { JournalEntry } from "@/lib/db/journal-queries";

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function formatTimestamp(iso: string): { date: string; time: string } {
  // O DB armazena `created_at` em UTC ("YYYY-MM-DD HH:MM:SS"). Trato como UTC
  // pra exibir em hora local.
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date: dateStr, time: timeStr };
}

export function entriesToMarkdown(
  entries: JournalEntry[],
  opts?: { title?: string; subtitle?: string },
): string {
  const sorted = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const lines: string[] = [];
  const title = opts?.title ?? "Journal";
  lines.push(`# ${title}`);
  if (opts?.subtitle) lines.push(`\n_${opts.subtitle}_`);
  lines.push(`\n_${sorted.length} entrada${sorted.length === 1 ? "" : "s"}_`);
  lines.push("");

  // Agrupa por dia
  let lastDate = "";
  for (const e of sorted) {
    const { date, time } = formatTimestamp(e.created_at);
    if (date !== lastDate) {
      const d = new Date(date);
      const human = `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
      lines.push(`\n## ${human}`);
      lines.push("");
      lastDate = date;
    }
    const meta: string[] = [time];
    if (e.mood) meta.push(e.mood);
    if (e.tags.length > 0) meta.push(e.tags.map((t) => `#${t}`).join(" "));
    lines.push(`### ${meta.join("  ·  ")}`);
    lines.push("");
    lines.push(e.content);
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function isoDateShort(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
