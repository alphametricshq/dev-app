"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { TrendingUp, Sparkles } from "lucide-react";
import type { XpHistory } from "@/lib/gamification/xp-history";

export function XpHistoryChart({ history }: { history: XpHistory }) {
  const data = history.points;

  const summary = useMemo(() => {
    const first = data[0]?.xp ?? 0;
    const last = data[data.length - 1]?.xp ?? 0;
    const gainedTotal = last - first;
    const dailyAvg = data.length > 0 ? gainedTotal / data.length : 0;
    const bestDay = data.reduce((best, d) => (d.delta > (best?.delta ?? -1) ? d : best), data[0]);
    return { gainedTotal, dailyAvg, bestDay, levelUpsCount: history.levelUps.length };
  }, [data, history.levelUps]);

  return (
    <div className="card">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-fg">Sua jornada de XP</h3>
            <p className="text-xs text-fg-muted">Últimos {data.length} dias</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-fg-muted">
          <span>
            <span className="font-mono text-fg">+{summary.gainedTotal.toLocaleString("pt-BR")}</span> XP no período
          </span>
          <span>·</span>
          <span>
            <span className="font-mono text-fg">{summary.dailyAvg.toFixed(0)}</span>/dia
          </span>
          {summary.levelUpsCount > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-success">
                <Sparkles className="h-3 w-3" />
                {summary.levelUpsCount} level{summary.levelUpsCount === 1 ? "" : "s"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(220 12% 18%)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="hsl(220 8% 45%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
              minTickGap={30}
            />
            <YAxis
              stroke="hsl(220 8% 45%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(220 14% 12%)",
                border: "1px solid hsl(220 12% 24%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(220 10% 95%)" }}
              labelFormatter={(v) => new Date(v as string).toLocaleDateString("pt-BR")}
              formatter={(value: number, name: string, item) => {
                if (name === "xp") {
                  const lvl = item?.payload?.level ?? 1;
                  const delta = item?.payload?.delta ?? 0;
                  return [`${value.toLocaleString("pt-BR")} XP · nv ${lvl} · +${delta} hoje`, "Total"];
                }
                return [value, name];
              }}
            />
            <Area
              type="monotone"
              dataKey="xp"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#xpGrad)"
            />
            {history.levelUps.map((lu, i) => (
              <ReferenceDot
                key={`${lu.date}-${lu.level}-${i}`}
                x={lu.date}
                y={lu.xp}
                r={5}
                fill="hsl(150 60% 50%)"
                stroke="hsl(220 14% 8%)"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{
                  value: `nv ${lu.level}`,
                  position: "top",
                  fontSize: 10,
                  fill: "hsl(150 60% 60%)",
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {summary.bestDay && summary.bestDay.delta > 0 && (
        <div className="mt-3 text-[11px] text-fg-subtle">
          Melhor dia:{" "}
          <span className="text-fg">{new Date(summary.bestDay.date).toLocaleDateString("pt-BR")}</span>{" "}
          com <span className="font-mono text-fg">+{summary.bestDay.delta}</span> XP
        </div>
      )}
    </div>
  );
}
