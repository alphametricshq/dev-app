"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";

const DISMISS_KEY = "eol-banner-dismissed-v1";
const WEB_URL = "https://alphametrics-web.vercel.app";

// Banner de End-of-Life: avisa que essa versão Electron vai sair de linha
// em favor da versão web. Fica no rodapé (não atrapalha a nav lateral),
// pode ser dispensado (persiste em localStorage).
export function EolBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!mounted || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-xl border border-accent/40 bg-gradient-to-r from-accent/10 to-accent/5 px-5 py-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <p className="text-sm">
            <span className="font-medium text-fg">Alphametrics Web já está no ar.</span>{" "}
            <span className="text-fg-muted">Este app desktop será descontinuado nas próximas semanas.</span>
          </p>
        </div>

        <a
          href={WEB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-fg-on-accent transition hover:bg-accent-hover"
        >
          Abrir agora <ExternalLink className="h-3 w-3" />
        </a>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar aviso"
          className="rounded-md p-1 text-fg-subtle transition hover:bg-bg-hover hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
