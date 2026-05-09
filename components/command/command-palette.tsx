"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Search,
  LayoutDashboard,
  Brain,
  KanbanSquare,
  Repeat,
  CalendarDays,
  Trophy,
  Github,
  Trello,
  Settings,
  RefreshCw,
  Play,
  Coffee,
  Plus,
  ExternalLink,
  CornerDownLeft,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribePalette, closePalette, openPalette } from "@/lib/command-palette";
import { start as startPomodoro, configureSession } from "@/lib/pomodoro-store";
import { toast } from "@/lib/toast";

type Command = {
  id: string;
  category: "Páginas" | "Ações" | "Cards" | "Pomodoro";
  title: string;
  subtitle?: string;
  icon: LucideIcon | string; // emoji string ou ícone
  keywords?: string[];
  action: () => void | Promise<void>;
};

type SearchResult = {
  id: string;
  name: string;
  url: string;
};

const NAV_COMMANDS_TPL = (router: ReturnType<typeof useRouter>): Command[] => [
  { id: "go-home", category: "Páginas", title: "Visão geral", icon: LayoutDashboard, action: () => router.push("/") },
  { id: "go-foco", category: "Páginas", title: "Foco (Pomodoro)", icon: Brain, action: () => router.push("/foco") },
  { id: "go-board", category: "Páginas", title: "Board", icon: KanbanSquare, action: () => router.push("/board") },
  { id: "go-habitos", category: "Páginas", title: "Hábitos", icon: Repeat, action: () => router.push("/habitos") },
  { id: "go-journal", category: "Páginas", title: "Journal", icon: BookOpen, keywords: ["nota", "anotacao"], action: () => router.push("/journal") },
  { id: "go-retro", category: "Páginas", title: "Retrospectiva", icon: CalendarDays, action: () => router.push("/retrospectiva") },
  { id: "go-conquistas", category: "Páginas", title: "Conquistas", icon: Trophy, action: () => router.push("/conquistas") },
  { id: "go-github", category: "Páginas", title: "GitHub", icon: Github, action: () => router.push("/github") },
  { id: "go-trello", category: "Páginas", title: "Trello", icon: Trello, action: () => router.push("/trello") },
  { id: "go-settings", category: "Páginas", title: "Configurações", icon: Settings, action: () => router.push("/settings") },
];

const POMO_COMMANDS_TPL = (router: ReturnType<typeof useRouter>): Command[] => [
  {
    id: "pomo-25",
    category: "Pomodoro",
    title: "Iniciar foco de 25 minutos",
    icon: Play,
    keywords: ["pomodoro", "timer", "foco"],
    action: () => {
      configureSession("focus", 25);
      startPomodoro({ type: "focus", durationMin: 25 });
      router.push("/foco");
    },
  },
  {
    id: "pomo-45",
    category: "Pomodoro",
    title: "Iniciar foco de 45 minutos",
    icon: Play,
    action: () => {
      configureSession("focus", 45);
      startPomodoro({ type: "focus", durationMin: 45 });
      router.push("/foco");
    },
  },
  {
    id: "pomo-break",
    category: "Pomodoro",
    title: "Pausa curta (5 min)",
    icon: Coffee,
    action: () => {
      configureSession("short_break", 5);
      startPomodoro({ type: "short_break", durationMin: 5 });
      router.push("/foco");
    },
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return subscribePalette(setOpen);
  }, []);

  // Atalho Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape" && open) {
        closePalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset state ao fechar/abrir
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search Trello (debounced)
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/trello/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data?.ok && Array.isArray(data.cards)) {
          setSearchResults(
            data.cards.map((c: { id: string; name: string; url: string }) => ({
              id: c.id,
              name: c.name,
              url: c.url,
            })),
          );
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  const navCommands = useMemo(() => NAV_COMMANDS_TPL(router), [router]);
  const pomoCommands = useMemo(() => POMO_COMMANDS_TPL(router), [router]);

  const actionCommands: Command[] = useMemo(
    () => [
      {
        id: "sync-now",
        category: "Ações",
        title: "Sincronizar agora",
        subtitle: "Atualiza GitHub + Trello",
        icon: RefreshCw,
        keywords: ["sync"],
        action: async () => {
          try {
            const res = await fetch("/api/sync/all", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error ?? "Sync falhou");
            toast.success("Sincronizado", data.message);
            setTimeout(() => location.reload(), 800);
          } catch (e) {
            toast.error("Falha no sync", e instanceof Error ? e.message : "Erro desconhecido");
          }
        },
      },
      {
        id: "new-habit",
        category: "Ações",
        title: "Novo hábito",
        icon: Plus,
        action: () => router.push("/habitos"),
      },
    ],
    [router],
  );

  const cardCommands: Command[] = useMemo(
    () =>
      searchResults.map((c) => ({
        id: `card-${c.id}`,
        category: "Cards" as const,
        title: c.name,
        subtitle: "Abrir no Trello",
        icon: ExternalLink,
        action: () => {
          window.open(c.url, "_blank", "noopener,noreferrer");
        },
      })),
    [searchResults],
  );

  // Filter all by query
  const allCommands = useMemo(() => {
    const list = [...navCommands, ...pomoCommands, ...actionCommands, ...cardCommands];
    if (!query.trim()) return list;
    const lower = query.toLowerCase();
    return list.filter((c) => {
      const text = [c.title, c.subtitle ?? "", ...(c.keywords ?? [])].join(" ").toLowerCase();
      return text.includes(lower);
    });
  }, [query, navCommands, pomoCommands, actionCommands, cardCommands]);

  // Keep activeIndex in bounds
  useEffect(() => {
    if (activeIndex >= allCommands.length) setActiveIndex(0);
  }, [allCommands.length, activeIndex]);

  function execute(cmd: Command) {
    closePalette();
    Promise.resolve(cmd.action()).catch(() => {});
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allCommands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = allCommands[activeIndex];
      if (cmd) execute(cmd);
    }
  }

  // Group commands by category
  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of allCommands) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [allCommands]);

  if (!mounted || !open) return null;

  let runningIndex = 0;

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && closePalette()}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-24 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-fg-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Digite um comando ou busque um card..."
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          {searching && <span className="text-[11px] text-fg-subtle">buscando...</span>}
          <kbd className="rounded bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {allCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-fg-muted">
              Nenhum comando encontrado.
            </div>
          )}
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} className="mb-2">
              <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                {category}
              </div>
              {cmds.map((cmd) => {
                const isActive = runningIndex === activeIndex;
                const Icon = cmd.icon;
                const idx = runningIndex++;
                return (
                  <button
                    key={cmd.id}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => execute(cmd)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isActive ? "bg-bg-hover text-fg" : "text-fg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        isActive ? "bg-accent/20 text-accent" : "bg-bg-subtle",
                      )}
                    >
                      {typeof Icon === "string" ? Icon : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-fg">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div className="truncate text-[11px] text-fg-subtle">{cmd.subtitle}</div>
                      )}
                    </div>
                    {isActive && <CornerDownLeft className="h-3 w-3 text-fg-subtle" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-bg-subtle/40 px-4 py-2 text-[11px] text-fg-subtle">
          <div className="flex items-center gap-2">
            <kbd className="rounded bg-bg-card px-1.5 py-0.5 font-mono">↑↓</kbd>
            <span>navegar</span>
            <kbd className="ml-2 rounded bg-bg-card px-1.5 py-0.5 font-mono">Enter</kbd>
            <span>selecionar</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="rounded bg-bg-card px-1.5 py-0.5 font-mono">Ctrl</kbd>
            <span>+</span>
            <kbd className="rounded bg-bg-card px-1.5 py-0.5 font-mono">K</kbd>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
