"use client";

let open = false;
let listeners: ((open: boolean) => void)[] = [];

function emit() {
  for (const l of listeners) l(open);
}

export function openHelp() {
  open = true;
  emit();
}
export function closeHelp() {
  open = false;
  emit();
}
export function toggleHelp() {
  open = !open;
  emit();
}
export function subscribeHelp(cb: (open: boolean) => void): () => void {
  listeners.push(cb);
  cb(open);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
