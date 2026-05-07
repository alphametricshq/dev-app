"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

const COLORS = [
  "hsl(265 85% 65%)",
  "hsl(40 90% 60%)",
  "hsl(150 60% 50%)",
  "hsl(200 80% 60%)",
  "hsl(320 70% 65%)",
];

export function BoardsBreakdown({ data }: { data: { board_name: string; count: number }[] }) {
  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-fg">Por board</h3>
        <p className="text-xs text-fg-muted">Distribuição de tarefas concluídas</p>
      </div>
      {data.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-fg-muted">
          Sem dados ainda — sincronize Trello para ver o breakdown
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="board_name"
                stroke="hsl(220 8% 65%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={120}
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
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
