"use client";

import { localIsoDate } from "@/lib/local-date";
import { useEffect, useRef, useState } from "react";
import { Database, Download, Upload, Loader2, History, RotateCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/dialogs";

type AutoBackup = { name: string; size: number; mtime: string };

export function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [autoBackups, setAutoBackups] = useState<AutoBackup[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadAutoBackups() {
    try {
      const res = await fetch("/api/backup/auto");
      const data = await res.json();
      if (data?.ok) setAutoBackups(data.backups ?? []);
    } catch {
      /* ignora */
    }
  }

  useEffect(() => {
    loadAutoBackups();
  }, []);

  async function handleCreateAuto() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/backup/auto", { method: "POST" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error);
      if (data.throttled) {
        toast.info("Backup recente", "Já há um backup criado nas últimas 24h");
      } else {
        toast.success("Backup criado", data.file);
      }
      loadAutoBackups();
    } catch (e) {
      toast.error("Erro", e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleRestoreAuto(name: string) {
    const ok = await confirmDialog({
      title: `Restaurar "${name}"?`,
      description:
        "⚠️ Vai SOBRESCREVER todos os dados atuais (hábitos, pomodoros, journal, configs).",
      confirmLabel: "Sobrescrever tudo",
      danger: true,
    });
    if (!ok) return;
    setRestoring(name);
    try {
      const res = await fetch("/api/backup/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: name }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Erro ao restaurar");
      const summary = Object.entries(data.counts as Record<string, number>)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
      toast.success("Backup restaurado", summary || "0 registros");
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      toast.error("Erro ao restaurar", e instanceof Error ? e.message : String(e));
    } finally {
      setRestoring(null);
    }
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error("Erro ao exportar");
      const blob = await res.blob();
      const filename = `dashboard-backup-${localIsoDate()}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Backup baixado", filename);
    } catch (e) {
      toast.error("Erro ao exportar", e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setExporting(false);
    }
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ok = await confirmDialog({
      title: "Importar backup?",
      description:
        "⚠️ Importar vai SOBRESCREVER todos os dados atuais (hábitos, pomodoros, journal, configs).",
      confirmLabel: "Sobrescrever tudo",
      danger: true,
    });
    if (!ok) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok || !result?.ok) throw new Error(result?.error ?? "Erro ao importar");

      const summary = Object.entries(result.counts as Record<string, number>)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
      toast.success("Backup importado", summary || "0 registros");
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      toast.error("Erro ao importar", e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="card">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-fg">Backup &amp; restauração</h2>
          <p className="text-xs text-fg-muted">
            Exporta hábitos, pomodoros, journal e configurações em JSON
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-subtle px-4 py-3 text-sm transition-colors hover:bg-bg-hover hover:text-fg disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar tudo
        </button>
        <button
          onClick={handleImportClick}
          disabled={importing}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-subtle px-4 py-3 text-sm transition-colors hover:bg-bg-hover hover:text-fg disabled:opacity-50"
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importar backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="mt-3 space-y-1 text-[11px] text-fg-subtle">
        <p>· Credenciais GitHub <strong className="text-fg-muted">não</strong> são exportadas (segurança).</p>
        <p>· Histórico de sync e contribuições GitHub são re-sincronizadas via API após restaurar.</p>
        <p>· Importar sobrescreve todos os dados — faça backup antes se necessário.</p>
      </div>

      {/* Backups automáticos */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-fg-muted" />
            <h3 className="text-sm font-medium text-fg">Backups automáticos</h3>
            <span className="text-[11px] text-fg-subtle">
              (gera 1× a cada 24h, guarda últimos 10)
            </span>
          </div>
          <button
            onClick={handleCreateAuto}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-[11px] hover:bg-bg-hover disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
            Criar agora
          </button>
        </div>
        {autoBackups.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-fg-subtle">
            Nenhum backup automático ainda — o primeiro será criado no próximo ciclo de sync
          </p>
        ) : (
          <ul className="space-y-1.5">
            {autoBackups.map((b) => (
              <li
                key={b.name}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-1.5 text-xs"
              >
                <span className="font-mono text-[11px] text-fg-muted">{b.name}</span>
                <span className="ml-auto font-mono text-[10px] text-fg-subtle">
                  {(b.size / 1024).toFixed(1)} KB
                </span>
                <button
                  onClick={() => handleRestoreAuto(b.name)}
                  disabled={restoring !== null}
                  className="rounded-full border border-border bg-bg-card px-2 py-0.5 text-[10px] text-fg-muted hover:border-accent/40 hover:text-fg disabled:opacity-50"
                >
                  {restoring === b.name ? "Restaurando..." : "Restaurar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
