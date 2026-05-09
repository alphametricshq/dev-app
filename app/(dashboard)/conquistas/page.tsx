import { Topbar } from "@/components/topbar";
import { LevelCard } from "@/components/gamification/level-card";
import { BadgesGrid } from "@/components/gamification/badges-grid";
import { GoalForecastList } from "@/components/gamification/goal-forecast-card";
import { getGamificationSummary } from "@/lib/gamification";
import { Award, Flame, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConquistasPage() {
  const data = await getGamificationSummary();

  return (
    <>
      <Topbar title="Conquistas" subtitle="XP, níveis, badges e metas" />
      <div className="space-y-8 px-8 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LevelCard data={data} />
          </div>
          <div className="card flex flex-col justify-center">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
              <Flame className="h-3.5 w-3.5 text-warning" />
              Streak
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-fg">{data.currentStreak}</span>
              <span className="text-sm text-fg-muted">dias atual</span>
            </div>
            <div className="mt-1 text-xs text-fg-subtle">
              Recorde: <span className="text-fg">{data.longestStreak}</span> dias
            </div>
          </div>
        </div>

        <section>
          <header className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-fg">Metas</h2>
          </header>
          <GoalForecastList goals={data.goals} />
        </section>

        <section>
          <header className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-fg">Conquistas</h2>
            </div>
            <span className="text-xs text-fg-muted">
              {data.unlockedBadges} de {data.totalBadges} desbloqueadas
            </span>
          </header>
          <BadgesGrid badges={data.badges} />
        </section>
      </div>
    </>
  );
}
