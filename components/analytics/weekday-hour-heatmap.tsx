import { Clock } from "lucide-react";
import type { WeekdayHourCell } from "@/lib/db/queries";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function intensity(count: number, max: number): string {
  if (count === 0) return "transparent";
  const ratio = max > 0 ? count / max : 0;
  const alpha = 0.2 + ratio * 0.8;
  return `hsl(var(--accent) / ${alpha.toFixed(2)})`;
}

export function WeekdayHourHeatmap({ data }: { data: WeekdayHourCell[] }) {
  const grid = new Map<string, number>();
  let max = 0;
  let peak: WeekdayHourCell | null = null;
  for (const cell of data) {
    grid.set(`${cell.weekday}:${cell.hour}`, cell.count);
    if (cell.count > max) {
      max = cell.count;
      peak = cell;
    }
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-fg">Quando você conclui</h3>
            <p className="text-xs text-fg-muted">Dia da semana × hora · 90 dias</p>
          </div>
        </div>
        {peak && (
          <span className="text-[11px] text-fg-muted">
            Pico: <span className="text-fg">{WEEKDAYS[peak.weekday]}</span> às{" "}
            <span className="font-mono text-fg">{String(peak.hour).padStart(2, "0")}h</span>
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <p className="py-6 text-center text-xs text-fg-subtle">
          Sem dados ainda — conclui umas tasks que o mapa aparece.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header de horas (de 2 em 2 pra não poluir) */}
            <div className="mb-1 flex pl-9">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="w-[18px] text-center text-[9px] text-fg-subtle">
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>
            {WEEKDAYS.map((label, weekday) => (
              <div key={weekday} className="flex items-center gap-0 py-[1.5px]">
                <div className="w-9 pr-2 text-right text-[10px] text-fg-subtle">{label}</div>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const count = grid.get(`${weekday}:${hour}`) ?? 0;
                  return (
                    <div key={hour} className="w-[18px] px-[1.5px]">
                      <div
                        className="h-[15px] rounded-[3px] border border-border/30"
                        style={{ backgroundColor: intensity(count, max) }}
                        title={`${label} ${String(hour).padStart(2, "0")}h — ${count} tarefa${count === 1 ? "" : "s"}`}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
