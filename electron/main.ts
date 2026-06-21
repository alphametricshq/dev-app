import { app, BrowserWindow, shell, Menu, ipcMain, screen, globalShortcut, Tray, nativeImage } from "electron";
import { autoUpdater } from "electron-updater";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import http from "node:http";
import net from "node:net";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const DEV_URL = "http://localhost:3000";

// Desabilita o popup de traducao automatica do Chromium
app.commandLine.appendSwitch("disable-features", "Translate");

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let quickCaptureWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let serverProcess: ChildProcess | null = null;
let serverUrl: string = DEV_URL;

// Em dev o Next pode subir em outra porta (3001+ quando a 3000 está ocupada).
// As janelas secundárias derivam a base da URL que a mainWindow carregou de
// fato, em vez de confiar no DEV_URL fixo.
function currentBaseUrl(): string {
  try {
    const u = mainWindow?.webContents.getURL();
    if (u && /^https?:/.test(u)) return new URL(u).origin;
  } catch {
    // cai pro serverUrl
  }
  return serverUrl;
}

// Mostra a janela principal mesmo quando está escondida na tray
// (restore() + focus() não revelam janela hidden); recria se foi destruída.
function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    void createWindow();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showMainWindow();
  });
}

async function findFreePort(start = 3717): Promise<number> {
  for (let port = start; port < start + 100; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const tester = net.createServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, "127.0.0.1");
    });
    if (free) return port;
  }
  throw new Error("Nenhuma porta livre encontrada");
}

function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else retry();
      });
      req.on("error", retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) reject(new Error("Server timeout"));
      else setTimeout(tick, 300);
    };
    tick();
  });
}

async function startNextServer(): Promise<string> {
  const port = await findFreePort(3717);
  const dataPath = app.getPath("userData");

  const candidatePaths = [
    path.join(process.resourcesPath, "standalone", "server.js"),
    path.join(__dirname, "..", ".next", "standalone", "server.js"),
  ];

  let foundScript: string | null = null;
  const fs = await import("node:fs");
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      foundScript = p;
      break;
    }
  }
  if (!foundScript) {
    throw new Error(`server.js nao encontrado:\n${candidatePaths.join("\n")}`);
  }

  const cwd = path.dirname(foundScript);

  serverProcess = spawn(process.execPath, [foundScript], {
    cwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DASHBOARD_DATA_PATH: dataPath,
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (d) => console.log("[server]", d.toString().trim()));
  serverProcess.stderr?.on("data", (d) => console.error("[server-err]", d.toString().trim()));
  serverProcess.on("exit", (code) => console.log("[server] exit", code));

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url, 60000);
  return url;
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show();
    overlayWindow.focus();
    return;
  }
  const primary = screen.getPrimaryDisplay();
  const { width: screenW } = primary.workAreaSize;
  const winW = 360;
  const winH = 64;
  const x = Math.round((screenW - winW) / 2);
  const y = 12;

  overlayWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: "#00000000",
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      additionalArguments: ["--pomodoro-overlay"],
    },
  });
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWindow.on("closed", () => {
    overlayWindow = null;
    // Avisa o mainWindow pra reexibir o FloatingTimer
    mainWindow?.webContents.send("pomodoro-overlay-closed");
  });

  overlayWindow.loadURL(`${currentBaseUrl()}/pomodoro-overlay`).then(() => {
    overlayWindow?.show();
  });
}

function createQuickCaptureWindow() {
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) {
    quickCaptureWindow.show();
    quickCaptureWindow.focus();
    return;
  }
  const primary = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primary.workAreaSize;
  const winW = 760;
  const winH = 460;
  const x = Math.round((screenW - winW) / 2);
  const y = Math.round((screenH - winH) / 3);

  quickCaptureWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: "#00000000",
    hasShadow: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      additionalArguments: ["--quick-capture"],
    },
  });

  quickCaptureWindow.on("closed", () => {
    quickCaptureWindow = null;
  });

  // Esc nativo fecha (sem precisar IPC)
  quickCaptureWindow.webContents.on("before-input-event", (_e, input) => {
    if (input.key === "Escape" && quickCaptureWindow) {
      quickCaptureWindow.close();
    }
  });

  quickCaptureWindow.loadURL(`${currentBaseUrl()}/quick-capture`).then(() => {
    quickCaptureWindow?.show();
    quickCaptureWindow?.focus();
  });
}

function setupQuickCaptureIpc() {
  ipcMain.on("quick-capture-open", () => {
    createQuickCaptureWindow();
  });
  ipcMain.on("quick-capture-close", () => {
    if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) quickCaptureWindow.close();
  });
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, "..", "dashboard.ico");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip("Dashboard Pessoal");

  const ctxMenu = Menu.buildFromTemplate([
    {
      label: "Abrir Dashboard",
      click: () => showMainWindow(),
    },
    { type: "separator" },
    {
      label: "Nova nota (Ctrl+Shift+J)",
      click: () => createQuickCaptureWindow(),
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(ctxMenu);
  tray.on("click", () => {
    if (mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      showMainWindow();
    }
  });
}

function setupTrayIpc() {
  ipcMain.on("tray-update-status", (_e, text: string) => {
    if (tray) tray.setToolTip(text || "Dashboard Pessoal");
  });
}

type ShortcutsConfig = {
  globalQuickCapture: string;
  globalPomodoroToggle: string;
};

const DEFAULT_SHORTCUTS: ShortcutsConfig = {
  globalQuickCapture: "CommandOrControl+Shift+J",
  globalPomodoroToggle: "CommandOrControl+Shift+Space",
};

function registerGlobalShortcuts(cfg: ShortcutsConfig) {
  globalShortcut.unregisterAll();
  try {
    const okJournal = globalShortcut.register(cfg.globalQuickCapture, () => {
      createQuickCaptureWindow();
    });
    if (!okJournal) console.warn(`[shortcuts] falha em registrar ${cfg.globalQuickCapture}`);
  } catch (e) {
    console.warn(`[shortcuts] erro ${cfg.globalQuickCapture}:`, e);
  }
  try {
    const okPomo = globalShortcut.register(cfg.globalPomodoroToggle, () => {
      // Manda evento pro renderer principal alternar pause/resume do timer ativo
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("pomodoro-toggle");
      }
    });
    if (!okPomo) console.warn(`[shortcuts] falha em registrar ${cfg.globalPomodoroToggle}`);
  } catch (e) {
    console.warn(`[shortcuts] erro ${cfg.globalPomodoroToggle}:`, e);
  }
}

function setupGlobalShortcuts() {
  registerGlobalShortcuts(DEFAULT_SHORTCUTS);
  ipcMain.on("update-shortcuts", (_e, cfg: ShortcutsConfig) => {
    registerGlobalShortcuts({
      globalQuickCapture: cfg?.globalQuickCapture || DEFAULT_SHORTCUTS.globalQuickCapture,
      globalPomodoroToggle: cfg?.globalPomodoroToggle || DEFAULT_SHORTCUTS.globalPomodoroToggle,
    });
  });
}

function setupPomodoroOverlayIpc() {
  ipcMain.on("pomodoro-overlay-open", () => {
    createOverlayWindow();
  });
  ipcMain.on("pomodoro-overlay-close", () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
  });
  // Estado vem do mainWindow, propaga pro overlay
  ipcMain.on("pomodoro-state-broadcast", (_e, state: unknown) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send("pomodoro-state-update", state);
    }
  });
  // Overlay solicita estado atual (no boot)
  ipcMain.on("pomodoro-state-request", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("pomodoro-state-request");
    }
  });
  // Controles do overlay -> mainWindow
  ipcMain.on("pomodoro-control", (_e, action: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("pomodoro-control", action);
    }
  });
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    console.log("[update] available:", info.version);
    mainWindow?.webContents.send("update-available", {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : null,
    });
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[update] no update");
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[update] downloaded:", info.version);
    mainWindow?.webContents.send("update-downloaded", {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : null,
    });
  });

  autoUpdater.on("error", (err) => {
    const msg = err?.message ?? String(err);
    console.error("[update] error:", msg);
    // Suprime erros típicos de repo privado / feed sem auth — não polui UI
    if (/404/.test(msg) || /releases\.atom/i.test(msg) || /authentication token/i.test(msg)) {
      return;
    }
    mainWindow?.webContents.send("update-error", msg);
  });

  ipcMain.on("install-update", () => {
    autoUpdater.quitAndInstall();
  });
  ipcMain.on("check-for-updates", () => {
    autoUpdater.checkForUpdates().catch((e) => console.error("[update] check failed:", e));
  });
  ipcMain.handle("get-app-version", () => app.getVersion());

  // Check no startup e a cada hora
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((e) => console.error("[update] check failed:", e));
    }, 5_000);
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((e) => console.error("[update] check failed:", e));
    }, 60 * 60 * 1000);
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0e1117",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "dashboard.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Fechar janela esconde pra tray (a menos que o user esteja realmente saindo)
  mainWindow.on("close", (e) => {
    if (!isQuitting && mainWindow) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  await mainWindow.loadURL(serverUrl);
}

app.whenReady().then(async () => {
  try {
    if (!isDev) {
      serverUrl = await startNextServer();
    }
    await createWindow();
    createTray();
    setupTrayIpc();
    setupAutoUpdater();
    setupPomodoroOverlayIpc();
    setupQuickCaptureIpc();
    setupGlobalShortcuts();
  } catch (e) {
    console.error("Falha ao iniciar:", e);
    const msg = e instanceof Error ? e.message : String(e);
    const errorHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`
      <html><body style="background:#0e1117;color:#e6edf3;font-family:sans-serif;padding:40px;">
        <h2>Erro ao iniciar o Dashboard</h2>
        <pre style="background:#161b22;padding:12px;border-radius:6px;white-space:pre-wrap;">${msg}</pre>
      </body></html>
    `)}`;
    mainWindow = new BrowserWindow({ width: 800, height: 500 });
    Menu.setApplicationMenu(null);
    await mainWindow.loadURL(errorHtml);
  }
});

app.on("window-all-closed", () => {
  // No Windows com tray, NÃO quita ao fechar todas as janelas — só quando isQuitting
  if (!isQuitting) return;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy();
  if (quickCaptureWindow && !quickCaptureWindow.isDestroyed()) quickCaptureWindow.destroy();
  if (tray) {
    tray.destroy();
    tray = null;
  }
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
