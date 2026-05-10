"use client";

import { Hash, Smile, BookOpen, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalStats } from "@/lib/db/journal-queries";

export function JournalStatsSidebar({
  stats,
  activeTag,
  onSelectTag,
}: {
  stats: JournalStats | null;
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
}) {
  if (!stats) {
    return (
      <div className="card text-xs text-fg-muted">Carregando estatísticas...</div>
    );
  }

  const topTags = stats.tagCounts.slice(0, 30);
  const maxCount = Math.max(1, ...topTags.map((t) => t.count));

  return (
    <aside className="space-y-4">
      <div className="card">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
          <BookOpen className="h-3.5 w-3.5" />
          Resumo
        </div>
        <div className="text-2xl font-semibold text-fg">{stats.totalEntries}</div>
        <div className="text-[11px] text-fg-subtle">notas no total</div>
      </div>

      {topTags.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
              <Hash className="h-3.5 w-3.5" />
              Top tags
            </div>
            {activeTag && (
              <button
                onClick={() => onSelectTag(null)}
                className="text-[10px] text-fg-subtle hover:text-fg"
              >
                limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map((t) => {
              const ratio = t.count / maxCount;
              // Tamanhos progressivos baseados em ratio (10px → 16px)
              const sizePx = Math.round(10 + ratio * 6);
              const opacity = 0.55 + ratio * 0.45;
              const isActive = activeTag === t.tag;
              return (
                <button
                  key={t.tag}
                  onClick={() => onSelectTag(isActive ? null : t.tag)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 leading-tight transition-all hover:scale-105",
                    isActive
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-fg-muted hover:border-accent/40 hover:text-fg",
                  )}
                  style={{
                    fontSize: `${sizePx}px`,
                    opacity: isActive ? 1 : opacity,
                  }}
                  title={`${t.count} nota${t.count === 1 ? "" : "s"}`}
                >
                  #{t.tag}
                  <span className="ml-1 text-[9px] opacity-60">{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stats.moodCounts.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
            <Smile className="h-3.5 w-3.5" />
            Mood
          </div>
          <div className="space-y-1.5">
            {stats.moodCounts.slice(0, 5).map((m) => {
              const pct = (m.count / stats.totalEntries) * 100;
              return (
                <div key={m.mood} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-center text-base">{m.mood}</span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-7 text-right font-mono text-[11px] text-fg-subtle">
                    {m.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
          <BarChart3 className="h-3.5 w-3.5" />
          Por mês
        </div>
        <MonthBars buckets={stats.byMonth} />
      </div>
    </aside>
  );
}

function MonthBars({ buckets }: { buckets: { label: string; count: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="flex items-end gap-1">
      {buckets.map((b, i) => {
        const pct = (b.count / max) * 100;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
            <div className="relative flex h-12 w-full items-end overflow-hidden rounded-sm bg-bg-subtle">
              <div
                className="w-full bg-accent transition-all"
                style={{ height: `${pct}%` }}
                title={`${b.count}`}
              />
            </div>
            <div className="text-[8px] text-fg-subtle">{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}
