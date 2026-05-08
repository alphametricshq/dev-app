"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Github, Trello, Settings, Sparkles, KanbanSquare, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/conquistas", label: "Conquistas", icon: Trophy },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/trello", label: "Trello", icon: Trello },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

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
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-[11px] text-fg-muted">Auto-sync ativo</span>
        </div>
        <div className="mt-1 text-[10px] text-fg-subtle">v0.1 · local</div>
      </div>
    </aside>
  );
}
