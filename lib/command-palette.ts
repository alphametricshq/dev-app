// Estado global pra abrir/fechar a Command Palette
"use client";

let open = false;
let listeners: ((open: boolean) => void)[] = [];

function emit() {
  for (const l of listeners) l(open);
}

export function openPalette() {
  open = true;
  emit();
}

export function closePalette() {
  open = false;
  emit();
}

export function togglePalette() {
  open = !open;
  emit();
}

export function isPaletteOpen() {
  return open;
}

export function subscribePalette(cb: (open: boolean) => void): () => void {
  listeners.push(cb);
  cb(open);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
