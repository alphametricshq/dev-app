import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, pattern: "short" | "long" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (pattern === "short") {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function isoDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}
