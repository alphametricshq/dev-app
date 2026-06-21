"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatRelative(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 5) return "agora";
  if (sec < 60) return `${sec}s atrás`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

export function LastUpdated({ at }: { at: number | null }) {
  const [, tick] = useState(0);

  // Re-render a cada 10s pra label "N min atrás" ficar fresca
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  if (!at) return null;

  const label = formatRelative(Date.now() - at);
  return (
    <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
      <Clock className="h-3 w-3" />
      atualizado {label}
    </span>
  );
}
