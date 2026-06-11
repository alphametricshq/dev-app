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
} from "recharts";
import { Clock } from "lucide-react";
import type { FocusByDay } from "@/lib/db/pomodoro-queries";

export function FocusMinutesChart({ data }: { data: FocusByDay[] }) {
  const filled = useMemo(() => fillDays(data, 30), [data]);
  const totalMin = useMemo(() => filled.reduce((s, d) => s + d.focus_min, 0), [filled]);
  const avgPerDay = totalMin > 0 ? totalMin / 30 : 0;

  return (
    <div className="card">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">Minutos focados</h3>
          </div>
          <p className="text-xs text-fg-muted">
            {totalMin}min em 30 dias · média {avgPerDay.toFixed(0)}min/dia
          </p>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer>
          <AreaChart data={filled} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
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
              formatter={(value: number, _name, item) => {
                const sessions = item?.payload?.sessions ?? 0;
                return [`${value} min · ${sessions} sessões`, "Foco"];
              }}
            />
            <Area
              type="monotone"
              dataKey="focus_min"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#focusGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function fillDays(data: FocusByDay[], days: number): FocusByDay[] {
  const map = new Map(data.map((d) => [d.date, d]));
  const result: FocusByDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = localIsoDate(d);
    const existing = map.get(iso);
    result.push(existing ?? { date: iso, focus_min: 0, sessions: 0 });
  }
  return result;
}
