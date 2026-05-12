import { contextBridge, ipcRenderer } from "electron";

type UpdateInfo = {
  version: string;
  releaseNotes?: string | null;
};

const isOverlay = process.argv.includes("--pomodoro-overlay");
const isQuickCapture = process.argv.includes("--quick-capture");
const isQuickTask = process.argv.includes("--quick-task");

contextBridge.exposeInMainWorld("electron", {
  // Detecta se está rodando em Electron (no browser puro window.electron seria undefined)
  isElectron: true,
  // Marca quando essa janela é o overlay (vs main)
  isOverlay,
  isQuickCapture,
  isQuickTask,

  onUpdateAvailable(callback: (info: UpdateInfo) => void) {
    const listener = (_e: unknown, info: UpdateInfo) => callback(info);
    ipcRenderer.on("update-available", listener);
    return () => ipcRenderer.removeListener("update-available", listener);
  },
  onUpdateDownloaded(callback: (info: UpdateInfo) => void) {
    const listener = (_e: unknown, info: UpdateInfo) => callback(info);
    ipcRenderer.on("update-downloaded", listener);
    return () => ipcRenderer.removeListener("update-downloaded", listener);
  },
  onUpdateError(callback: (msg: string) => void) {
    const listener = (_e: unknown, msg: string) => callback(msg);
    ipcRenderer.on("update-error", listener);
    return () => ipcRenderer.removeListener("update-error", listener);
  },
  installUpdate() {
    ipcRenderer.send("install-update");
  },
  checkForUpdates() {
    ipcRenderer.send("check-for-updates");
  },
  getAppVersion(): Promise<string> {
    return ipcRenderer.invoke("get-app-version");
  },

  // ==== Pomodoro overlay ====
  openPomodoroOverlay() {
    ipcRenderer.send("pomodoro-overlay-open");
  },
  closePomodoroOverlay() {
    ipcRenderer.send("pomodoro-overlay-close");
  },
  onPomodoroOverlayClosed(cb: () => void) {
    const listener = () => cb();
    ipcRenderer.on("pomodoro-overlay-closed", listener);
    return () => ipcRenderer.removeListener("pomodoro-overlay-closed", listener);
  },
  // mainWindow -> overlay: envia estado
  broadcastPomodoroState(state: unknown) {
    ipcRenderer.send("pomodoro-state-broadcast", state);
  },
  // overlay -> recebe estado
  onPomodoroState(cb: (state: unknown) => void) {
    const listener = (_e: unknown, state: unknown) => cb(state);
    ipcRenderer.on("pomodoro-state-update", listener);
    return () => ipcRenderer.removeListener("pomodoro-state-update", listener);
  },
  // overlay -> main: pede estado inicial
  requestPomodoroState() {
    ipcRenderer.send("pomodoro-state-request");
  },
  // mainWindow -> ouve pedidos de estado e replica
  onPomodoroStateRequest(cb: () => void) {
    const listener = () => cb();
    ipcRenderer.on("pomodoro-state-request", listener);
    return () => ipcRenderer.removeListener("pomodoro-state-request", listener);
  },
  // overlay -> main: envia ação (pause, resume, stop)
  sendPomodoroControl(action: "pause" | "resume" | "stop") {
    ipcRenderer.send("pomodoro-control", action);
  },
  // mainWindow -> ouve ações
  onPomodoroControl(cb: (action: string) => void) {
    const listener = (_e: unknown, action: string) => cb(action);
    ipcRenderer.on("pomodoro-control", listener);
    return () => ipcRenderer.removeListener("pomodoro-control", listener);
  },

  // ==== Quick capture ====
  openQuickCapture() {
    ipcRenderer.send("quick-capture-open");
  },
  closeQuickCapture() {
    ipcRenderer.send("quick-capture-close");
  },

  // ==== Quick task ====
  openQuickTask() {
    ipcRenderer.send("quick-task-open");
  },
  closeQuickTask() {
    ipcRenderer.send("quick-task-close");
  },

  // ==== Tray ====
  updateTrayStatus(text: string) {
    ipcRenderer.send("tray-update-status", text);
  },
});
