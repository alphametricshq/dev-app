// Toast store global com pub/sub. Sem dependencias externas.

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastInput = {
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
};

export type Toast = ToastInput & {
  id: string;
  type: ToastType;
  duration: number;
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(toasts);
}

export function subscribeToasts(cb: (toasts: Toast[]) => void): () => void {
  listeners.push(cb);
  cb(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function pushToast(input: ToastInput): string {
  const type = input.type ?? "info";
  const duration = input.duration ?? DEFAULT_DURATION[type];
  const id = `t${nextId++}`;
  const t: Toast = { id, type, title: input.title, description: input.description, duration };
  toasts = [...toasts, t];
  emit();
  if (duration > 0 && typeof window !== "undefined") {
    setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    pushToast({ type: "success", title, description, duration }),
  error: (title: string, description?: string, duration?: number) =>
    pushToast({ type: "error", title, description, duration }),
  info: (title: string, description?: string, duration?: number) =>
    pushToast({ type: "info", title, description, duration }),
  warning: (title: string, description?: string, duration?: number) =>
    pushToast({ type: "warning", title, description, duration }),
};
