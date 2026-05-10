"use client";

import { useMemo } from "react";

export function Sparkline({
  values,
  width = 80,
  height = 28,
  color = "currentColor",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const path = useMemo(() => {
    if (values.length === 0) return { line: "", area: "", maxIdx: -1 };
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;
    const points = values.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return [x, y] as const;
    });
    const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${(points[points.length - 1][0]).toFixed(1)},${height} L0,${height} Z`;
    let maxIdx = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] >= values[maxIdx]) maxIdx = i;
    }
    return { line, area, maxIdx, points };
  }, [values, width, height]);

  if (values.length === 0) return null;

  return (
    <svg width={width} height={height} className="shrink-0 overflow-visible">
      <path d={path.area} fill={color} fillOpacity={0.15} />
      <path d={path.line} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {path.points && path.points[path.maxIdx] && (
        <circle
          cx={path.points[path.maxIdx][0]}
          cy={path.points[path.maxIdx][1]}
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}
