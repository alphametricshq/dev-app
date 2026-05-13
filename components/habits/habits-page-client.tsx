"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Loader2, AlertCircle, Sparkles, LayoutGrid, CalendarDays } from "lucide-react";
import { HabitCard } from "./habit-card";
import { HabitForm, type HabitFormValues } from "./habit-form";
import { HabitsCalendarView } from "./habits-calendar-view";
import { HabitsWeeklyGoals } from "./weekly-goals-card";
import { cn } from "@/lib/utils";
import type { HabitWithStats } from "@/lib/db/habits-queries";

type ViewMode = "cards" | "calendar";

export function HabitsPageClient() {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HabitWithStats | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<ViewMode>("cards");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/habits");
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error ?? "Falha ao carregar");
      setHabits(data.habits);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(values: HabitFormValues) {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error);
    await refresh();
  }

  async function handleEdit(values: HabitFormValues) {
    if (!editing) return;
    const res = await fetch(`/api/habits/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error);
    await refresh();
  }

  async function handleArchive(habit: HabitWithStats) {
    setHabits((prev) => prev.filter((h) => h.id !== habit.id));
    try {
      const res = await fetch(`/api/habits/${habit.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      refresh();
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = habits.findIndex((h) => h.id === active.id);
    const newIdx = habits.findIndex((h) => h.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(habits, oldIdx, newIdx);
    const before = habits;
    setHabits(reordered);
    try {
      const res = await fetch("/api/habits/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((h) => h.id) }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHabits(before);
    }
  }

  async function handleToggle(habit: HabitWithStats) {
    const next = !habit.doneToday;
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              doneToday: next,
              currentStreak: next ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1),
              thisWeekCount: next ? h.thisWeekCount + 1 : Math.max(0, h.thisWeekCount - 1),
            }
          : h,
      ),
    );
    try {
      const res = await fetch(`/api/habits/${habit.id}/log`, {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: next ? JSON.stringify({}) : undefined,
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      // refresh assíncrono pra recalcular streaks corretamente
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      refresh();
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center text-fg-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando hábitos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-fg-muted hover:text-fg">
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="flex-1 text-sm text-fg-muted">
          {habits.length === 0
            ? "Nenhum hábito ainda. Crie o primeiro pra começar a tracker."
            : `${habits.length} hábito${habits.length === 1 ? "" : "s"} ativo${habits.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex gap-1 rounded-full border border-border bg-bg-subtle p-1">
          <button
            onClick={() => setView("cards")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              view === "cards" ? "bg-bg-card text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            <LayoutGrid className="h-3 w-3" />
            Cards
          </button>
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
              view === "calendar" ? "bg-bg-card text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            <CalendarDays className="h-3 w-3" />
            Calendário
          </button>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Novo hábito
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Sparkles className="h-8 w-8 text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-fg">Comece com um hábito</h3>
            <p className="mt-1 text-xs text-fg-muted">
              Sugestões: ler 30min, exercício, beber 2L água, meditar, dormir 7h+...
            </p>
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Criar primeiro hábito
          </button>
        </div>
      ) : view === "calendar" ? (
        <HabitsCalendarView />
      ) : (
        <>
          <HabitsWeeklyGoals habits={habits} />
          <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={habits.map((h) => h.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {habits.map((h) => (
                <HabitCard
                  key={h.id}
                  habit={h}
                  onToggleToday={handleToggle}
                  onEdit={(habit) => setEditing(habit)}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        </>
      )}

      {creating && <HabitForm onClose={() => setCreating(false)} onSave={handleCreate} />}
      {editing && (
        <HabitForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
