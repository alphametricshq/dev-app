import { Trophy, Sparkles, Award } from "lucide-react";
import type { GamificationSummary } from "@/lib/gamification";

export function LevelCard({ data, compact = false }: { data: GamificationSummary; compact?: boolean }) {
  const xpToNext = data.xpForNextLevel - data.xpInLevel;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-bg-card via-bg-card to-accent/10 p-5">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />

      <div className="relative flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/60 shadow-lg shadow-accent/30">
          <Trophy className="h-7 w-7 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-fg">Nível {data.level}</span>
            <span className="text-xs uppercase tracking-wider text-fg-muted">{data.levelTitle}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-muted">
            <Sparkles className="h-3 w-3 text-accent" />
            <span className="font-mono text-fg">{data.xp.toLocaleString("pt-BR")} XP</span>
            <span>·</span>
            <span>
              <Award className="mr-0.5 inline h-3 w-3" />
              {data.unlockedBadges}/{data.totalBadges} conquistas
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-fg-muted">Progresso pro nível {data.level + 1}</span>
          <span className="font-mono text-fg">
            {data.xpInLevel} / {data.xpForNextLevel} XP
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all"
            style={{ width: `${data.progressPct}%` }}
          />
        </div>
        {!compact && (
          <div className="mt-2 text-[11px] text-fg-subtle">
            Faltam <span className="text-fg">{xpToNext} XP</span> pra subir de nível
          </div>
        )}
      </div>
    </div>
  );
}
