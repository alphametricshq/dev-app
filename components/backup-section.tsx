"use client";

import { useRef, useState } from "react";
import { Database, Download, Upload, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/dialogs";

export function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error("Erro ao exportar");
      const blob = await res.blob();
      const filename = `dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
        "⚠️ Importar vai SOBRESCREVER todos os dados atuais (hábitos, pomodoros, journal, pinned cards, configs).",
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
            Exporta hábitos, pomodoros, journal, pinned cards e configurações em JSON
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
        <p>· Credenciais GitHub/Trello <strong className="text-fg-muted">não</strong> são exportadas (segurança).</p>
        <p>· Histórico de sync e contribuições GitHub são re-sincronizadas via API após restaurar.</p>
        <p>· Importar sobrescreve todos os dados — faça backup antes se necessário.</p>
      </div>
    </div>
  );
}
