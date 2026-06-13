"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  TrendingUp,
  GitCommit,
  CheckSquare,
  Sparkles,
  Award,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Copy,
  Download,
} from "lucide-react";
import { ComparisonCard } from "@/components/analytics/comparison-card";
import { InsightsBox } from "@/components/analytics/insights-box";
import { cn } from "@/lib/utils";
import { localIsoDate } from "@/lib/local-date";
import { toast } from "@/lib/toast";
import { weeklyReviewToMarkdown } from "@/lib/weekly-review-export";
import { downloadMarkdown } from "@/lib/journal-export";
import type { WeeklyReview } from "@/lib/weekly-review";

export function WeeklyReviewClient() {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    fetch(`/api/weekly-review?weeksAgo=${weeksAgo}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        if (!data?.ok) throw new Error(data?.error ?? "Falha ao carregar");
        setReview(data.review);
      })
      .catch((e) => !cancel && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [weeksAgo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeeksAgo((w) => Math.min(12, w + 1))}
            disabled={weeksAgo >= 12}
            className="rounded-lg border border-border p-1.5 text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
            <div>
              <h2 className="text-lg font-semibold text-fg">
                {review?.weekLabel ?? "..."}
              </h2>
              <p className="text-xs text-fg-muted">
                {review?.isCurrent
                  ? "Semana atual"
                  : `${weeksAgo} semana${weeksAgo === 1 ? "" : "s"} atrás`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setWeeksAgo((w) => Math.max(0, w - 1))}
            disabled={weeksAgo === 0}
            className="rounded-lg border border-border p-1.5 text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {review && (
            <>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(weeklyReviewToMarkdown(review));
                    toast.success("Resumo copiado", "Markdown pronto pra colar");
                  } catch {
                    toast.error("Não consegui copiar");
                  }
                }}
                className="btn-secondary py-1.5 text-xs"
                title="Copiar resumo da semana em Markdown"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar resumo
              </button>
              <button
                onClick={() =>
                  downloadMarkdown(
                    `retrospectiva-${review.weekStart}.md`,
                    weeklyReviewToMarkdown(review),
                  )
                }
                className="btn-secondary py-1.5 text-xs"
                title="Baixar resumo em .md"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {weeksAgo > 0 && (
            <button onClick={() => setWeeksAgo(0)} className="btn-secondary py-1.5 text-xs">
              Voltar pra atual
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex h-[300px] items-center justify-center text-fg-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Calculando retrospectiva...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {!loading && review && (
        <>
          {/* Hero stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <HeroStat icon={GitCommit} label="Commits" value={review.github.current} accent="github" />
            <HeroStat icon={CheckSquare} label="Tarefas" value={review.trello.current} accent="trello" />
            <HeroStat icon={Sparkles} label="XP estimado" value={review.xp.earned.toLocaleString("pt-BR")} accent="default" />
            <HeroStat icon={CalendarDays} label="Dias ativos" value={`${review.highlights.activeDays}/7`} accent="default" />
          </div>

          {/* Comparações */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ComparisonCard label="GitHub vs semana anterior" comparison={review.github} unit="commits" accent="github" />
            <ComparisonCard label="Trello vs semana anterior" comparison={review.trello} unit="tarefas" accent="trello" />
          </div>

          {/* Dia a dia */}
          <DailyBreakdown review={review} />

          {/* Hábitos da semana */}
          {review.habits.summary.length > 0 && (
            <HabitsWeekCard habits={review.habits.summary} perfectDays={review.habits.perfectDays} />
          )}

          {/* Novas badges */}
          {review.newBadges.length > 0 && (
            <div className="card border-warning/40 bg-warning/5">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-fg">Conquistas desbloqueadas</h3>
              </div>
              <ul className="flex flex-wrap gap-2">
                {review.newBadges.map((b) => (
                  <li key={b} className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs text-warning">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top boards */}
          {review.trello.topBoards.length > 0 && (
            <div className="card">
              <div className="mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-fg">Top boards (90 dias)</h3>
              </div>
              <ul className="space-y-1.5">
                {review.trello.topBoards.map((b, i) => (
                  <li key={b.board_name} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-fg">{b.board_name}</span>
                    <span className="font-mono text-xs text-fg-muted">{b.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comparativo vs média móvel 4w */}
          <FourWeekAverages data={review.vsAvg4Weeks} />

          {/* Insights */}
          <InsightsBox insights={review.insights} title="Resumo da semana" />
        </>
      )}
    </div>
  );
}

function FourWeekAverages({
  data,
}: {
  data: {
    github: { current: number; avg4w: number; deltaPct: number | null };
    trello: { current: number; avg4w: number; deltaPct: number | null };
  };
}) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <Award className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">Esta semana vs média 4 semanas</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AvgRow label="GitHub" current={data.github.current} avg={data.github.avg4w} deltaPct={data.github.deltaPct} />
        <AvgRow label="Trello" current={data.trello.current} avg={data.trello.avg4w} deltaPct={data.trello.deltaPct} />
      </div>
    </div>
  );
}

function AvgRow({
  label,
  current,
  avg,
  deltaPct,
}: {
  label: string;
  current: number;
  avg: number;
  deltaPct: number | null;
}) {
  const sign = deltaPct == null ? "" : deltaPct >= 0 ? "+" : "";
  const color = deltaPct == null ? "text-fg-muted" : deltaPct >= 0 ? "text-success" : "text-danger";
  return (
    <div className="rounded-lg border border-border/50 bg-bg-subtle px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-fg-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-fg">{current}</span>
        <span className="text-[11px] text-fg-subtle">vs {avg.toFixed(1)} média</span>
      </div>
      <div className={`text-xs font-medium ${color}`}>
        {deltaPct == null ? "—" : `${sign}${Math.round(deltaPct)}% vs média 4w`}
      </div>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
  accent: "github" | "trello" | "default";
}) {
  const colorMap = {
    github: "text-success bg-success/15",
    trello: "text-warning bg-warning/15",
    default: "text-accent bg-accent/15",
  };
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colorMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-fg-muted">{label}</div>
          <div className="text-xl font-semibold text-fg">{value}</div>
        </div>
      </div>
    </div>
  );
}

function DailyBreakdown({ review }: { review: WeeklyReview }) {
  const days = review.github.daily.map((d, i) => ({
    weekday: d.weekday,
    date: d.date,
    gh: d.count,
    tr: review.trello.daily[i]?.count ?? 0,
  }));
  const max = Math.max(1, ...days.map((d) => d.gh + d.tr));

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Dia a dia</h3>
        <div className="flex gap-3 text-[11px] text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" /> Commits
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" /> Tarefas
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const ghH = max > 0 ? (d.gh / max) * 100 : 0;
          const trH = max > 0 ? (d.tr / max) * 100 : 0;
          const isToday = d.date === localIsoDate();
          return (
            <div key={d.date} className={cn("flex flex-col items-center gap-2", isToday && "font-semibold")}>
              <div className="flex h-32 w-full flex-col-reverse overflow-hidden rounded-lg bg-bg-subtle">
                {ghH > 0 && (
                  <div
                    className="w-full bg-success/80 transition-all"
                    style={{ height: `${ghH}%` }}
                    title={`${d.gh} commits`}
                  />
                )}
                {trH > 0 && (
                  <div
                    className="w-full bg-warning/80 transition-all"
                    style={{ height: `${trH}%` }}
                    title={`${d.tr} tarefas`}
                  />
                )}
              </div>
              <div className="text-[11px] text-fg-muted">{d.weekday}</div>
              <div className="font-mono text-[11px] text-fg">{d.gh + d.tr}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HabitsWeekCard({
  habits,
  perfectDays,
}: {
  habits: WeeklyReview["habits"]["summary"];
  perfectDays: number;
}) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">Hábitos na semana</h3>
        {perfectDays > 0 && (
          <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] text-success">
            {perfectDays} dia{perfectDays === 1 ? "" : "s"} perfeito{perfectDays === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <ul className="space-y-2.5">
        {habits.map((h) => {
          const done = h.completed >= h.target;
          return (
            <li key={h.id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-base">{h.emoji}</span>
                <span className="flex-1 truncate text-fg">{h.name}</span>
                <span className={cn("font-mono", done ? "text-success" : "text-fg-muted")}>
                  {h.completed} / {h.target}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
                <div
                  className={cn("h-full rounded-full transition-all", done ? "bg-success" : "bg-accent")}
                  style={{ width: `${Math.min(100, h.pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
