// Store global do timer pomodoro. Pub/sub + persistência em localStorage.
// Permite que o timer continue rodando ao navegar entre páginas.

import { toast } from "@/lib/toast";
import { playComplete, playBreak } from "@/lib/sounds";
import { notifyPomodoroComplete } from "@/lib/desktop-notifications";

export type SessionType = "focus" | "short_break" | "long_break";

export type PomodoroState = {
  status: "idle" | "running" | "paused";
  type: SessionType;
  durationMin: number;
  startedAt: number; // timestamp ms (real start)
  pausedAt: number | null;
  pausedTotalMs: number;
  cardId: string | null;
  cardName: string | null;
  // Ciclos automáticos: foco → pausa → foco... (pausa longa no 4º foco)
  autoCycle: boolean;
  cycleIndex: number; // focos completados no ciclo atual (0-4)
  focusDurationMin: number; // duração de foco preferida (pausas usam defaults)
};

export const CYCLE_LENGTH = 4;

const STORAGE_KEY = "pomodoro-state-v1";
const TICK_MS = 1000;

const TYPE_LABELS: Record<SessionType, string> = {
  focus: "Foco",
  short_break: "Pausa curta",
  long_break: "Pausa longa",
};

const DEFAULT_DURATIONS: Record<SessionType, number> = {
  focus: 25,
  short_break: 5,
  long_break: 15,
};

function defaultState(): PomodoroState {
  return {
    status: "idle",
    type: "focus",
    durationMin: DEFAULT_DURATIONS.focus,
    startedAt: 0,
    pausedAt: null,
    pausedTotalMs: 0,
    cardId: null,
    cardName: null,
    autoCycle: false,
    cycleIndex: 0,
    focusDurationMin: DEFAULT_DURATIONS.focus,
  };
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadFromStorage(): PomodoroState | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // merge com defaults: estados persistidos antes de campos novos existirem
    return { ...defaultState(), ...(JSON.parse(raw) as Partial<PomodoroState>) };
  } catch {
    return null;
  }
}

function persist() {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

let state: PomodoroState = loadFromStorage() ?? defaultState();
let listeners: ((s: PomodoroState) => void)[] = [];
let tickInterval: ReturnType<typeof setInterval> | null = null;
let recovering = false;

function emit() {
  for (const l of listeners) l(state);
}

function setState(next: Partial<PomodoroState>) {
  state = { ...state, ...next };
  persist();
  emit();
}

export function getState(): PomodoroState {
  return state;
}

export function getRemainingSeconds(s: PomodoroState = state): number {
  const totalMs = s.durationMin * 60 * 1000;
  if (s.status === "idle") return s.durationMin * 60;
  const reference = s.status === "paused" && s.pausedAt ? s.pausedAt : Date.now();
  const elapsedMs = reference - s.startedAt - s.pausedTotalMs;
  const remainingMs = totalMs - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function getProgressPct(s: PomodoroState = state): number {
  const total = s.durationMin * 60;
  const remaining = getRemainingSeconds(s);
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
}

function startTick() {
  if (tickInterval || state.status !== "running") return;
  tickInterval = setInterval(() => {
    if (getRemainingSeconds() <= 0) {
      complete();
    } else {
      emit();
    }
  }, TICK_MS);
}

function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export function configureSession(type: SessionType, durationMin: number) {
  if (state.status !== "idle") return;
  setState({
    type,
    durationMin,
    ...(type === "focus" ? { focusDurationMin: durationMin } : {}),
  });
}

export function setAutoCycle(on: boolean) {
  setState({ autoCycle: on, cycleIndex: 0 });
}

export function setSessionCard(cardId: string | null, cardName: string | null) {
  setState({ cardId, cardName });
}

export function start(opts?: {
  type?: SessionType;
  durationMin?: number;
  cardId?: string | null;
  cardName?: string | null;
}) {
  const type = opts?.type ?? state.type;
  const durationMin = opts?.durationMin ?? state.durationMin;
  setState({
    status: "running",
    type,
    durationMin,
    startedAt: Date.now(),
    pausedAt: null,
    pausedTotalMs: 0,
    cardId: opts?.cardId ?? state.cardId ?? null,
    cardName: opts?.cardName ?? state.cardName ?? null,
    ...(type === "focus" && opts?.durationMin ? { focusDurationMin: opts.durationMin } : {}),
  });
  startTick();
}

export function pause() {
  if (state.status !== "running") return;
  setState({ status: "paused", pausedAt: Date.now() });
  stopTick();
}

export function resume() {
  if (state.status !== "paused" || !state.pausedAt) return;
  const pausedFor = Date.now() - state.pausedAt;
  setState({
    status: "running",
    pausedTotalMs: state.pausedTotalMs + pausedFor,
    pausedAt: null,
  });
  startTick();
}

export function reset() {
  stopTick();
  setState({
    status: "idle",
    startedAt: 0,
    pausedAt: null,
    pausedTotalMs: 0,
  });
}

export function stop() {
  stopTick();
  setState({
    status: "idle",
    startedAt: 0,
    pausedAt: null,
    pausedTotalMs: 0,
    cycleIndex: 0, // parar manualmente zera o ciclo
  });
}

export async function complete() {
  if (state.status === "idle") return;
  if (recovering) return;
  recovering = true;

  const finished = new Date();
  const started = new Date(state.startedAt);
  const completedType = state.type;
  const completedDuration = state.durationMin;
  const completedCardId = state.cardId;
  const completedCardName = state.cardName;

  // Reset state primeiro para evitar reentry
  stopTick();
  setState({
    status: "idle",
    startedAt: 0,
    pausedAt: null,
    pausedTotalMs: 0,
  });

  try {
    const res = await fetch("/api/pomodoro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: completedType,
        duration_min: completedDuration,
        started_at: started.toISOString().slice(0, 19).replace("T", " "),
        finished_at: finished.toISOString().slice(0, 19).replace("T", " "),
        card_id: completedCardId,
        card_name: completedCardName,
        completed: true,
      }),
    });
    const data = await res.json();
    if (data?.ok) {
      if (completedType === "focus") {
        playComplete();
        toast.success("Pomodoro completo! +15 XP", `${completedDuration} minutos de foco registrados.`);
      } else {
        playBreak();
        toast.info("Pausa concluída", "Bora pro próximo foco?");
      }
      notifyPomodoroComplete(completedDuration, completedType);
    }
  } catch {
    toast.error("Erro ao registrar sessão");
  } finally {
    recovering = false;
  }

  // Ciclos automáticos: encadeia a próxima sessão (mesmo se a gravação falhou,
  // o fluxo de trabalho do usuário não deve travar)
  if (state.autoCycle) {
    if (completedType === "focus") {
      const nextIndex = state.cycleIndex + 1;
      setState({ cycleIndex: nextIndex });
      if (nextIndex >= CYCLE_LENGTH) {
        toast.success("4 focos completos! 🏆", "Pausa longa merecida.");
        start({ type: "long_break", durationMin: DEFAULT_DURATIONS.long_break });
      } else {
        start({ type: "short_break", durationMin: DEFAULT_DURATIONS.short_break });
      }
    } else if (completedType === "short_break") {
      start({ type: "focus", durationMin: state.focusDurationMin });
    } else {
      // pausa longa terminou: ciclo fechado — para e celebra
      setState({ cycleIndex: 0, type: "focus", durationMin: state.focusDurationMin });
      toast.success("Ciclo completo! 🎉", "4 focos + pausa longa. Recomeça quando quiser.");
    }
  }
}

export function subscribe(cb: (s: PomodoroState) => void): () => void {
  listeners.push(cb);
  cb(state);
  // Garante tick rodando se foi recuperado de localStorage como running
  if (state.status === "running" && !tickInterval) {
    // Se já passou: completar; senão, retomar tick
    if (getRemainingSeconds() <= 0) {
      complete();
    } else {
      startTick();
    }
  }
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export const PomodoroLabels = TYPE_LABELS;
export const PomodoroDefaults = DEFAULT_DURATIONS;
