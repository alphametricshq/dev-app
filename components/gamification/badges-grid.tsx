import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BadgeStatus } from "@/lib/gamification/badges";

export function BadgesGrid({ badges }: { badges: BadgeStatus[] }) {
  const unlocked = badges.filter((b) => b.unlocked);
  const locked = badges.filter((b) => !b.unlocked);
  const ordered = [...unlocked, ...locked];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {ordered.map((b) => (
        <BadgeCard key={b.id} badge={b} />
      ))}
    </div>
  );
}

function BadgeCard({ badge }: { badge: BadgeStatus }) {
  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
        badge.unlocked
          ? "border-accent/40 bg-gradient-to-br from-accent/10 to-bg-card hover:border-accent"
          : "border-border bg-bg-card opacity-60 hover:opacity-90",
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full text-3xl transition-transform group-hover:scale-110",
          badge.unlocked ? "bg-accent/15" : "bg-bg-subtle grayscale",
        )}
      >
        {badge.unlocked ? badge.emoji : <Lock className="h-5 w-5 text-fg-subtle" />}
      </div>
      <div className="space-y-0.5">
        <div className={cn("text-sm font-semibold", badge.unlocked ? "text-fg" : "text-fg-muted")}>
          {badge.title}
        </div>
        <div className="text-[11px] leading-snug text-fg-muted">{badge.description}</div>
      </div>
      {badge.progress && !badge.unlocked && (
        <div className="mt-1 w-full">
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-subtle">
            <div
              className="h-full rounded-full bg-fg-muted/60"
              style={{ width: `${(badge.progress.current / badge.progress.target) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] font-mono text-fg-subtle">
            {badge.progress.current}/{badge.progress.target}
          </div>
        </div>
      )}
    </div>
  );
}
