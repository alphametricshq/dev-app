import { contextBridge, ipcRenderer } from "electron";

type UpdateInfo = {
  version: string;
  releaseNotes?: string | null;
};

contextBridge.exposeInMainWorld("electron", {
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
});
