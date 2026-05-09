"use client";

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export function MonthlyTrend({ data }: { data: { month: string; count: number }[] }) {
  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-fg">Tendência mensal</h3>
        <p className="text-xs text-fg-muted">Últimos 6 meses</p>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(150 60% 50%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(150 60% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(220 12% 18%)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="hsl(220 8% 65%)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(220 8% 45%)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(220 14% 12%)",
                border: "1px solid hsl(220 12% 24%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(220 10% 95%)" }}
              formatter={(v: number) => [`${v} contribuições`, ""]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(150 60% 50%)"
              strokeWidth={2}
              fill="url(#monthGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
