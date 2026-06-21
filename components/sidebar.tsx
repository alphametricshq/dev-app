"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Github, Settings, Sparkles, Trophy, Repeat, CalendarDays, Brain, BookOpen, FolderKanban, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import pkg from "@/package.json";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/foco", label: "Foco", icon: Brain },
  { href: "/demandas", label: "Demandas", icon: FolderKanban },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/habitos", label: "Hábitos", icon: Repeat },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/retrospectiva", label: "Retrospectiva", icon: CalendarDays },
  { href: "/conquistas", label: "Conquistas", icon: Trophy },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/settings", label: "Configurações", icon: Settings },
];

type SyncIndicator = {
  configured: boolean;
  lastSync: string | null;
  lastStatus: "success" | "error" | null;
};

export function Sidebar() {
  const pathname = usePathname();
  const [sync, setSync] = useState<SyncIndicator | null>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const res = await fetch("/api/sync/status");
        const data = await res.json();
        if (!cancel && data?.ok) {
          setSync({
            configured: !!data.configured,
            lastSync: data.lastSync ?? null,
            lastStatus: data.lastStatus ?? null,
          });
        }
      } catch {
        // silencioso — mantém o último estado conhecido
      }
    }
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, []);

  const syncError = sync?.lastStatus === "error";
  const syncOff = sync ? !sync.configured : false;
  const syncLabel = syncOff
    ? "Sync não configurado"
    : syncError
      ? "Sync com erro"
      : "Auto-sync ativo";
  const syncTitle = sync?.lastSync
    ? `Último sync: ${new Date(sync.lastSync).toLocaleString("pt-BR")}`
    : undefined;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-bg-subtle">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-fg">Dopamine</div>
          <div className="text-xs text-fg-muted">dashboard pessoal</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent/15 text-fg"
                      : "text-fg-muted hover:bg-bg-hover hover:text-fg"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2" title={syncTitle}>
          <span className="relative flex h-2 w-2">
            {!syncOff && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                  syncError ? "bg-danger" : "bg-success",
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                syncOff ? "bg-fg-subtle" : syncError ? "bg-danger" : "bg-success",
              )}
            />
          </span>
          <span className="text-[11px] text-fg-muted">{syncLabel}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-fg-subtle">
          <kbd className="rounded border border-border bg-bg-card px-1 font-mono">?</kbd>
          <span>atalhos</span>
          <span className="ml-auto opacity-60">v{pkg.version}</span>
        </div>
      </div>
    </aside>
  );
}
