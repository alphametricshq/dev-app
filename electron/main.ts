import { app, BrowserWindow, shell, Menu, ipcMain } from "electron";
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
let serverProcess: ChildProcess | null = null;
let serverUrl: string = DEV_URL;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
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
    console.error("[update] error:", err);
    mainWindow?.webContents.send("update-error", err.message ?? String(err));
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

  await mainWindow.loadURL(serverUrl);
}

app.whenReady().then(async () => {
  try {
    if (!isDev) {
      serverUrl = await startNextServer();
    }
    await createWindow();
    setupAutoUpdater();
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
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
