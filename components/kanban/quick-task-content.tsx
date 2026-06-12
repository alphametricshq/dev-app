"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanSquare, X, CheckCircle2, Loader2, Send, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { isTodoListName } from "@/lib/trello-hints";
import type { ProjectMeta } from "@/lib/integrations/github-project";

type Board = { id: string; name: string };
type List = { id: string; name: string; closed: boolean };
type Dest = "trello" | "demanda";

const LAST_BOARD_KEY = "quick-task-last-board";
const LAST_DEST_KEY = "quick-task-last-dest";

type ElectronAPI = {
  closeQuickTask?: () => void;
};

function closeWindow() {
  const api = (window as unknown as { electron?: ElectronAPI }).electron;
  if (api?.closeQuickTask) api.closeQuickTask();
  else window.close(); // fora do Electron (dev no browser)
}

export function QuickTaskContent() {
  const [dest, setDest] = useState<Dest>("trello");
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingLists, setLoadingLists] = useState(false);
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [prioridadeId, setPrioridadeId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  // Erros separados por origem pra um não vazar na aba do outro
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeWindow();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Último destino usado
  useEffect(() => {
    const last = localStorage.getItem(LAST_DEST_KEY);
    if (last === "demanda") setDest("demanda");
  }, []);

  // Boards (Trello)
  useEffect(() => {
    fetch("/api/trello/boards")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.boards)) {
          setBoards(data.boards);
          const last = typeof window !== "undefined" ? localStorage.getItem(LAST_BOARD_KEY) : null;
          const defaultId =
            last && data.boards.some((b: Board) => b.id === last) ? last : data.boards[0]?.id ?? null;
          setSelectedBoardId(defaultId);
        }
      })
      .catch((e) => setBoardsError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingBoards(false));
  }, []);

  // Lists do board selecionado (Trello). Limpa as listas antes do fetch pra
  // nunca submeter numa lista stale do board anterior.
  useEffect(() => {
    if (!selectedBoardId) return;
    setLists([]);
    setLoadingLists(true);
    fetch(`/api/trello/boards/${selectedBoardId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.board) setLists(data.board.lists ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingLists(false));
  }, [selectedBoardId]);

  function loadMeta() {
    setLoadingMeta(true);
    setMetaError(null);
    fetch("/api/project/demand")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.meta) setMeta(data.meta);
        else setMetaError(data?.error ?? "Falha ao carregar o Project");
      })
      .catch((e) => setMetaError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingMeta(false));
  }

  // Meta do Project (sob demanda, quando a aba Demanda abre)
  useEffect(() => {
    if (dest !== "demanda" || meta || loadingMeta) return;
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest]);

  function switchDest(d: Dest) {
    if (d === dest) return;
    setDest(d);
    setSubmitError(null);
    localStorage.setItem(LAST_DEST_KEY, d);
  }

  // Detecta lista alvo: primeira que bate nos hints de To-do, senão a primeira aberta
  const targetList = useMemo(() => {
    const open = lists.filter((l) => !l.closed);
    const matched = open.find((l) => isTodoListName(l.name));
    return matched ?? open[0] ?? null;
  }, [lists]);

  const canSubmit =
    !!title.trim() && !submitting && (dest === "trello" ? !!targetList && !loadingLists : !!meta);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (dest === "trello") {
        const res = await fetch("/api/trello/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idList: targetList!.id,
            name: title.trim(),
            desc: desc.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error ?? "Erro ao criar");
        if (selectedBoardId) localStorage.setItem(LAST_BOARD_KEY, selectedBoardId);
        setSaved(targetList ? `em "${targetList.name}"` : "no Trello");
        setTimeout(() => closeWindow(), 800);
      } else {
        const trimmed = title.trim();
        const clienteName = meta!.clienteField?.options.find((o) => o.id === clienteId)?.name;
        const finalTitle =
          clienteName && !trimmed.startsWith("[") ? `[${clienteName}] ${trimmed}` : trimmed;
        const fields: { fieldId: string; optionId: string }[] = [];
        const backlog = meta!.statusOptions[0];
        if (backlog) fields.push({ fieldId: meta!.statusFieldId, optionId: backlog.id });
        if (clienteId && meta!.clienteField) {
          fields.push({ fieldId: meta!.clienteField.id, optionId: clienteId });
        }
        if (prioridadeId && meta!.prioridadeField) {
          fields.push({ fieldId: meta!.prioridadeField.id, optionId: prioridadeId });
        }
        const res = await fetch("/api/project/demand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: meta!.projectId,
            title: finalTitle,
            description: desc.trim() || undefined,
            fields,
          }),
        });
        const data = await res.json();
        if (!data?.ok) {
          // Sucesso parcial (draft criado, campos falharam): fecha mesmo assim
          // — retry duplicaria o draft — mas avisa que precisa ajustar no GitHub.
          if (data?.itemId) {
            setSaved("mas sem todos os campos — ajusta Status/Cliente no GitHub");
            setTimeout(() => closeWindow(), 2500);
            return;
          }
          throw new Error(data?.error ?? "Erro ao criar demanda");
        }
        setSaved(`no board${backlog ? ` (${backlog.name})` : ""} como draft`);
        setTimeout(() => closeWindow(), 800);
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  function onFieldKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
  }

  const selectClass =
    "w-full rounded-lg border border-border bg-bg-subtle px-2 py-1 text-xs text-fg focus:border-accent focus:outline-none";

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-border bg-bg-card shadow-2xl">
      <header
        className="flex items-center justify-between border-b border-border px-4 py-2.5"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <KanbanSquare className="h-4 w-4 text-accent" />
          <h1 className="text-sm font-semibold text-fg">
            {dest === "trello" ? "Nova task" : "Nova demanda"}
          </h1>
          <span className="text-[10px] text-fg-subtle">Esc fecha · Ctrl+Enter cria</span>
        </div>
        <button
          onClick={closeWindow}
          className="rounded-lg p-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div
        className="flex-1 space-y-3 overflow-y-auto p-4"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {saved ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-success">
            <CheckCircle2 className="h-10 w-10" />
            <p className="text-sm font-medium">
              {dest === "trello" ? "Card criado!" : "Demanda criada!"}
            </p>
            <p className="text-[11px] text-fg-subtle">{saved}</p>
          </div>
        ) : (
          <>
            <div className="flex gap-1 rounded-lg bg-bg-subtle p-1">
              {(
                [
                  { key: "trello", label: "Trello", icon: KanbanSquare },
                  { key: "demanda", label: "Demanda GH", icon: ClipboardList },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => switchDest(t.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                    dest === t.key
                      ? "bg-bg-card font-medium text-fg shadow-sm"
                      : "text-fg-muted hover:text-fg",
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {submitError && (
              <div className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {submitError}
              </div>
            )}

            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={onFieldKeyDown}
              placeholder={dest === "trello" ? "Título da task..." : "Título da demanda..."}
              className="input"
            />

            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={onFieldKeyDown}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />

            {dest === "trello" ? (
              loadingBoards ? (
                <div className="flex items-center justify-center py-2 text-fg-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando boards...
                </div>
              ) : boards.length === 0 ? (
                <div className="py-2 text-center text-sm text-fg-muted">
                  {boardsError ?? "Nenhum board do Trello disponível"}
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    {boards.length > 1 && (
                      <select
                        value={selectedBoardId ?? ""}
                        onChange={(e) => setSelectedBoardId(e.target.value)}
                        onKeyDown={onFieldKeyDown}
                        className={selectClass}
                      >
                        {boards.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-[11px] text-fg-subtle">
                      {loadingLists ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          buscando lista...
                        </span>
                      ) : targetList ? (
                        <>
                          vai pra <span className="text-fg">&ldquo;{targetList.name}&rdquo;</span>
                        </>
                      ) : (
                        <span className="text-warning">sem lista disponível</span>
                      )}
                    </p>
                  </div>

                  <button onClick={submit} disabled={!canSubmit} className="btn-primary py-1.5 text-xs">
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "Criando..." : "Criar"}
                  </button>
                </div>
              )
            ) : loadingMeta ? (
              <div className="flex items-center justify-center py-2 text-fg-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando Project...
              </div>
            ) : meta ? (
              <div className="flex items-end gap-2">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  {meta.clienteField && (
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      onKeyDown={onFieldKeyDown}
                      className={selectClass}
                      aria-label="Cliente"
                    >
                      <option value="">Cliente —</option>
                      {meta.clienteField.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {meta.prioridadeField && (
                    <select
                      value={prioridadeId}
                      onChange={(e) => setPrioridadeId(e.target.value)}
                      onKeyDown={onFieldKeyDown}
                      className={selectClass}
                      aria-label="Prioridade"
                    >
                      <option value="">Prioridade —</option>
                      {meta.prioridadeField.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="col-span-2 text-[11px] text-fg-subtle">
                    vai pro board como <span className="text-fg">draft</span>
                    {meta.statusOptions[0] ? (
                      <>
                        {" "}
                        em <span className="text-fg">{meta.statusOptions[0].name}</span>
                      </>
                    ) : null}
                  </p>
                </div>

                <button onClick={submit} disabled={!canSubmit} className="btn-primary py-1.5 text-xs">
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Criando..." : "Criar"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {metaError ?? "Falha ao carregar o Project"}
                </div>
                <button onClick={loadMeta} className="btn-secondary py-1 text-xs">
                  Tentar de novo
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
