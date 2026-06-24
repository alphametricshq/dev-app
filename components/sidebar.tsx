"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Github,
  Settings,
  Trophy,
  Repeat,
  CalendarDays,
  Brain,
  BookOpen,
  FolderKanban,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import pkg from "@/package.json";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/foco", label: "Foco", icon: Brain },
  { href: "/demandas", label: "Demandas", icon: FolderKanban },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/sdk", label: "SDK", icon: Package },
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

const COLLAPSED_KEY = "sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [sync, setSync] = useState<SyncIndicator | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

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

  // Pre-mount: SSR renderiza expandida pra não dar flicker
  const isCollapsed = mounted && collapsed;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-bg-subtle transition-[width] duration-150",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center py-5",
          isCollapsed ? "justify-center px-2" : "gap-2.5 px-5",
        )}
      >
        <div className="relative h-9 w-9 shrink-0">
          <Image
            src="/brand/logo-icon-green.svg"
            alt="Alphametrics"
            fill
            sizes="36px"
            priority
          />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <div className="font-display text-sm font-bold leading-tight text-fg">
              Alphametrics
            </div>
            <div className="text-[10px] uppercase tracking-wider text-fg-muted">
              Dev App
            </div>
          </div>
        )}
      </div>

      <nav className={cn("flex-1 py-2", isCollapsed ? "px-2" : "px-3")}>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg py-2 text-sm transition-colors",
                    isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "bg-accent/15 text-fg"
                      : "text-fg-muted hover:bg-bg-hover hover:text-fg",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("border-t border-border", isCollapsed ? "p-2" : "p-4")}>
        {/* Toggle collapse */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "flex w-full items-center rounded-lg py-1.5 text-fg-muted hover:bg-bg-hover hover:text-fg",
            isCollapsed ? "justify-center px-1.5" : "gap-2 px-2",
          )}
          title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px]">Recolher</span>
            </>
          )}
        </button>

        {!isCollapsed && (
          <>
            <div className="mt-2 flex items-center gap-2" title={syncTitle}>
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
          </>
        )}

        {isCollapsed && (
          <div className="mt-2 flex justify-center" title={syncTitle}>
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
          </div>
        )}
      </div>
    </aside>
  );
}
