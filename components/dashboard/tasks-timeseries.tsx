"use client";

import { localIsoDate } from "@/lib/local-date";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export function TasksTimeseries({
  data,
  dailyTarget,
}: {
  data: { date: string; count: number }[];
  dailyTarget?: number;
}) {
  const filled = useMemo(() => fillMissingDays(data, 90), [data]);
  const total = useMemo(() => filled.reduce((s, d) => s + d.count, 0), [filled]);

  return (
    <div className="card">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-fg">Tarefas concluídas</h3>
          <p className="text-xs text-fg-muted">{total} nos últimos 90 dias</p>
        </div>
        {dailyTarget != null && dailyTarget > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <span className="h-px w-3 border-t border-dashed border-accent" />
            Meta: {dailyTarget}/dia
          </div>
        )}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <AreaChart data={filled} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(40 90% 60%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(40 90% 60%)" stopOpacity={0} />
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
              allowDecimals={false}
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
              formatter={(value: number) => [`${value} tarefa(s)`, "Concluídas"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(40 90% 60%)"
              strokeWidth={2}
              fill="url(#taskGrad)"
            />
            {dailyTarget != null && dailyTarget > 0 && (
              <ReferenceLine
                y={dailyTarget}
                stroke="hsl(var(--accent))"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function fillMissingDays(data: { date: string; count: number }[], days: number) {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const result: { date: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = localIsoDate(d);
    result.push({ date: iso, count: map.get(iso) ?? 0 });
  }
  return result;
}
