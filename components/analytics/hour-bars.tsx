"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

export function HourBars({
  data,
  peakHour,
  color = "hsl(40 90% 60%)",
}: {
  data: { hour: number; label: string; count: number }[];
  peakHour?: { hour: number; label: string } | null;
  color?: string;
}) {
  return (
    <div className="card">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-fg">Hora do dia</h3>
          <p className="text-xs text-fg-muted">Distribuição de tarefas concluídas</p>
        </div>
        {peakHour && (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] text-warning">
            Pico: {peakHour.label}
          </span>
        )}
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="hour"
              stroke="hsl(220 8% 65%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval={2}
              tickFormatter={(v) => `${v}h`}
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
              cursor={{ fill: "hsl(220 14% 15%)" }}
              formatter={(v: number) => [`${v} tarefa(s)`, "Concluídas"]}
              labelFormatter={(h: number) => `${String(h).padStart(2, "0")}:00`}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={peakHour && d.hour === peakHour.hour ? color : `${color.replace(/\)$/, " / 0.35)").replace("hsl", "hsla")}`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
