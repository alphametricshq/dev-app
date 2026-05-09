"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

export function WeekdayBars({
  data,
  title,
  subtitle,
  color = "hsl(150 60% 50%)",
  valueKey = "count",
  bestWeekday,
}: {
  data: { label: string; count: number; avg?: number }[];
  title: string;
  subtitle?: string;
  color?: string;
  valueKey?: "count" | "avg";
  bestWeekday?: { label: string } | null;
}) {
  return (
    <div className="card">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {subtitle && <p className="text-xs text-fg-muted">{subtitle}</p>}
        </div>
        {bestWeekday && (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success">
            Pico: {bestWeekday.label}
          </span>
        )}
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" stroke="hsl(220 8% 65%)" fontSize={11} tickLine={false} axisLine={false} />
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
              cursor={{ fill: "hsl(220 14% 15%)" }}
              formatter={(v: number) => [
                valueKey === "avg" ? v.toFixed(1) : v,
                valueKey === "avg" ? "média" : "total",
              ]}
            />
            <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={bestWeekday && d.label === bestWeekday.label ? color : `${color.replace(/\)$/, " / 0.4)").replace("hsl", "hsla")}`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
