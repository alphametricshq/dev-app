// Hook do electron-builder.
// 1) Copia .next/standalone (incluindo node_modules) pro bundle empacotado —
//    extraResources nao copia node_modules de forma confiavel.
// 2) Reescreve recursos do .exe (icone + descricao + product name) via rcedit
//    porque o build esta com `signAndEditExecutable: false` (evita o caminho
//    de winCodeSign que requer privilegio de symlink no Windows). Sem isso
//    o exe sai com icone padrao Electron.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    fs.copyFileSync(src, dst);
  }
}

function resolveRcedit() {
  // electron-builder traz rcedit embutido em alguma das deps; tenta achar
  const candidates = [
    path.join(__dirname, "..", "node_modules", "app-builder-bin", "win", "x64", "app-builder.exe"),
  ];
  // rcedit-x64.exe vem dentro do pacote `rcedit` (transitive de app-builder-lib)
  try {
    const rceditPkg = require.resolve("rcedit/package.json");
    candidates.unshift(path.join(path.dirname(rceditPkg), "bin", "rcedit-x64.exe"));
  } catch {
    /* ignora */
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function applyExeMetadata(exePath, projectRoot, pkg) {
  // Tenta usar rcedit. Se nao tiver, instala via npm na hora.
  let rceditMod;
  try {
    rceditMod = require("rcedit");
  } catch {
    console.log("[after-pack] instalando rcedit...");
    execFileSync("npm", ["install", "--no-save", "rcedit"], {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
    });
    rceditMod = require("rcedit");
  }
  // A v4+ exporta { rcedit } em vez de funcao default
  const rcedit = typeof rceditMod === "function" ? rceditMod : rceditMod.rcedit;
  const icon = path.join(projectRoot, "dashboard.ico");
  return rcedit(exePath, {
    icon,
    "file-version": pkg.version,
    "product-version": pkg.version,
    "version-string": {
      ProductName: "Alphametrics Dev App",
      FileDescription: "Alphametrics Dev App",
      CompanyName: "Alphametrics",
      LegalCopyright: `Copyright (c) ${new Date().getFullYear()} Alphametrics`,
      OriginalFilename: "Alphametrics Dev App.exe",
    },
  });
}

exports.default = async function (context) {
  const projectRoot = path.join(__dirname, "..");
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));

  // === 1. standalone ===
  const standaloneSrc = path.join(projectRoot, ".next", "standalone");
  const standaloneDst = path.join(context.appOutDir, "resources", "standalone");
  console.log(`[after-pack] copiando standalone -> ${standaloneDst}`);
  if (fs.existsSync(standaloneDst)) {
    fs.rmSync(standaloneDst, { recursive: true, force: true });
  }
  copyRecursive(standaloneSrc, standaloneDst);

  // === 2. metadata + icone do .exe ===
  // Crítico: se rcedit falhar, o build TEM que falhar. Senão sai release com
  // exe sem ícone (caso da v0.12.0/0.12.1 — dor pra resolver depois).
  const exeName = `${pkg.build.productName}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  if (!fs.existsSync(exePath)) {
    throw new Error(`[after-pack] exe nao encontrado em ${exePath}`);
  }
  console.log(`[after-pack] rcedit ${exeName} (icone + metadata)...`);
  await applyExeMetadata(exePath, projectRoot, pkg);
  // Valida via PowerShell que metadata foi aplicado de fato — não confia em "rcedit OK silent"
  const { execFileSync } = require("node:child_process");
  const productName = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `(Get-Item -LiteralPath '${exePath.replace(/'/g, "''")}').VersionInfo.ProductName`,
    ],
    { encoding: "utf8" },
  ).trim();
  if (productName !== pkg.build.productName) {
    throw new Error(
      `[after-pack] rcedit nao aplicou metadata. ProductName esperado="${pkg.build.productName}", atual="${productName}". Build abortado.`,
    );
  }
  console.log(`[after-pack] rcedit OK (ProductName=${productName})`);

  console.log("[after-pack] OK");
};
