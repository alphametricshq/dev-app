// Store global do timer pomodoro. Pub/sub + persistência em localStorage.
// Permite que o timer continue rodando ao navegar entre páginas.

import { toast } from "@/lib/toast";

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
};

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
    return JSON.parse(raw) as PomodoroState;
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
  setState({ type, durationMin });
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
        toast.success("Pomodoro completo! +15 XP", `${completedDuration} minutos de foco registrados.`);
      } else {
        toast.info("Pausa concluída", "Bora pro próximo foco?");
      }
      // Notificação nativa
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Pomodoro completo!", {
            body: `Sessão de ${TYPE_LABELS[completedType]} (${completedDuration}min) finalizada.`,
          });
        }
      }
    }
  } catch {
    toast.error("Erro ao registrar sessão");
  } finally {
    recovering = false;
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
