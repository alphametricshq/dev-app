"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { alertDialog, confirmDialog } from "@/lib/dialogs";
import {
  isSoundsEnabled,
  setSoundsEnabled,
  previewSound,
} from "@/lib/sounds";
import {
  getSoundConfig,
  setSoundConfig,
  updateSoundEvent,
  updateSoundVolume,
  EVENT_LABELS,
  PRESET_LABELS,
  type SoundConfig,
  type SoundEvent,
  type SoundPresetId,
} from "@/lib/sounds-config";

const PRESETS_ORDER: SoundPresetId[] = ["classic", "eightBit", "soft", "bell", "custom", "off"];

export function SoundsToggle() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<SoundConfig | null>(null);

  useEffect(() => {
    setMounted(true);
    setEnabled(isSoundsEnabled());
    setConfig(getSoundConfig());
  }, []);

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    setSoundsEnabled(next);
    if (next) previewSound("classic", "complete");
  }

  function onVolume(v: number) {
    const updated = updateSoundVolume(v);
    setConfig({ ...updated });
  }

  function onPreset(event: SoundEvent, preset: SoundPresetId) {
    const cur = config?.events[event];
    const updated = updateSoundEvent(event, {
      preset,
      customDataUrl: cur?.customDataUrl,
      customName: cur?.customName,
    });
    setConfig({ ...updated });
    if (preset !== "off") {
      previewSound(preset, event, cur?.customDataUrl);
    }
  }

  function onCustomFile(event: SoundEvent, file: File) {
    if (file.size > 1.5 * 1024 * 1024) {
      alertDialog({
        title: "Arquivo muito grande",
        description: "Limite: ~1.5MB (localStorage)",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated = updateSoundEvent(event, {
        preset: "custom",
        customDataUrl: dataUrl,
        customName: file.name,
      });
      setConfig({ ...updated });
      previewSound("custom", event, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function clearCustom(event: SoundEvent) {
    const updated = updateSoundEvent(event, {
      preset: "classic",
      customDataUrl: undefined,
      customName: undefined,
    });
    setConfig({ ...updated });
  }

  async function resetAll() {
    const ok = await confirmDialog({
      title: "Resetar todos os sons pro padrão?",
      confirmLabel: "Resetar",
      danger: true,
    });
    if (!ok) return;
    const def: SoundConfig = {
      volume: 0.6,
      events: {
        complete: { preset: "classic" },
        break: { preset: "classic" },
        levelUp: { preset: "classic" },
        goal: { preset: "classic" },
      },
    };
    setSoundConfig(def);
    setConfig(def);
  }

  return (
    <div className="card space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          {enabled && mounted ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-fg">Sons</h2>
          <p className="text-xs text-fg-muted">
            Toques nos eventos. Cada evento tem seu preset, e dá pra subir áudio próprio.
          </p>
        </div>
        <button
          onClick={toggleEnabled}
          disabled={!mounted}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            enabled ? "bg-accent" : "bg-bg-hover",
          )}
          aria-label={enabled ? "Desligar sons" : "Ligar sons"}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </header>

      {mounted && enabled && config && (
        <>
          <VolumeRow value={config.volume} onChange={onVolume} />

          <div className="space-y-3">
            {(Object.keys(EVENT_LABELS) as SoundEvent[]).map((ev) => (
              <EventRow
                key={ev}
                event={ev}
                cfg={config.events[ev]}
                onPreset={(p) => onPreset(ev, p)}
                onUpload={(f) => onCustomFile(ev, f)}
                onClearCustom={() => clearCustom(ev)}
              />
            ))}
          </div>

          <div className="flex justify-end border-t border-border pt-3">
            <button
              onClick={resetAll}
              className="text-[11px] text-fg-muted hover:text-fg"
            >
              Resetar tudo
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function VolumeRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-fg-muted">Volume geral</span>
        <span className="font-mono text-fg">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full accent-accent"
      />
    </div>
  );
}

function EventRow({
  event,
  cfg,
  onPreset,
  onUpload,
  onClearCustom,
}: {
  event: SoundEvent;
  cfg: { preset: SoundPresetId; customDataUrl?: string; customName?: string };
  onPreset: (p: SoundPresetId) => void;
  onUpload: (f: File) => void;
  onClearCustom: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-border/50 bg-bg-subtle p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-fg">{EVENT_LABELS[event]}</div>
        <button
          onClick={() => previewSound(cfg.preset, event, cfg.customDataUrl)}
          disabled={cfg.preset === "off"}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-accent hover:bg-accent/10 disabled:opacity-40"
          title="Tocar preview"
        >
          <Play className="h-3 w-3" />
          Tocar
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS_ORDER.map((p) => {
          const active = cfg.preset === p;
          const isCustomNoFile = p === "custom" && !cfg.customDataUrl;
          return (
            <button
              key={p}
              onClick={() => {
                if (p === "custom" && !cfg.customDataUrl) {
                  fileRef.current?.click();
                  return;
                }
                onPreset(p);
              }}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                active
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-fg-muted hover:bg-bg-hover hover:text-fg",
                isCustomNoFile && "border-dashed",
              )}
            >
              {PRESET_LABELS[p]}
            </button>
          );
        })}
      </div>

      {cfg.preset === "custom" && cfg.customDataUrl && (
        <div className="mt-2 flex items-center gap-2 rounded bg-bg-card px-2 py-1 text-[11px] text-fg-muted">
          <span className="flex-1 truncate" title={cfg.customName}>
            🎵 {cfg.customName ?? "arquivo customizado"}
          </span>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-fg-subtle hover:text-fg"
            title="Trocar arquivo"
          >
            <Upload className="h-3 w-3" />
          </button>
          <button
            onClick={onClearCustom}
            className="text-fg-subtle hover:text-danger"
            title="Remover áudio customizado"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
