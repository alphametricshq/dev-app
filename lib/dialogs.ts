// Dialog store global com pub/sub, mesmo padrão de lib/toast.ts.
// Substitui window.confirm/prompt/alert (que travam o foco no Electron —
// e prompt() nem existe lá).

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
};

export type PromptOptions = {
  title: string;
  description?: string;
  placeholder?: string;
  initial?: string;
  submitLabel?: string;
};

export type AlertOptions = {
  title: string;
  description?: string;
};

export type ActiveDialog =
  | { kind: "confirm"; id: number; opts: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "prompt"; id: number; opts: PromptOptions; resolve: (value: string | null) => void }
  | { kind: "alert"; id: number; opts: AlertOptions; resolve: () => void };

let dialogs: ActiveDialog[] = [];
let listeners: ((dialogs: ActiveDialog[]) => void)[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(dialogs);
}

export function subscribeDialogs(cb: (dialogs: ActiveDialog[]) => void): () => void {
  listeners.push(cb);
  cb(dialogs);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function removeDialog(id: number) {
  dialogs = dialogs.filter((d) => d.id !== id);
  emit();
}

function pushDialog(d: ActiveDialog) {
  dialogs = [...dialogs, d];
  emit();
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const id = nextId++;
    pushDialog({
      kind: "confirm",
      id,
      opts,
      resolve: (ok) => {
        removeDialog(id);
        resolve(ok);
      },
    });
  });
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const id = nextId++;
    pushDialog({
      kind: "prompt",
      id,
      opts,
      resolve: (value) => {
        removeDialog(id);
        resolve(value);
      },
    });
  });
}

export function alertDialog(opts: AlertOptions): Promise<void> {
  return new Promise((resolve) => {
    const id = nextId++;
    pushDialog({
      kind: "alert",
      id,
      opts,
      resolve: () => {
        removeDialog(id);
        resolve();
      },
    });
  });
}
