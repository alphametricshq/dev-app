// Hook do electron-builder: copia .next/standalone (incluindo node_modules)
// para dentro do bundle empacotado.
// extraResources nao copia node_modules de forma confiavel.
const fs = require("node:fs");
const path = require("node:path");

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

exports.default = async function (context) {
  const projectRoot = path.join(__dirname, "..");
  const standaloneSrc = path.join(projectRoot, ".next", "standalone");
  const standaloneDst = path.join(context.appOutDir, "resources", "standalone");

  console.log(`[after-pack] copiando standalone -> ${standaloneDst}`);
  // Limpa primeiro pra evitar resquícios da extraResources
  if (fs.existsSync(standaloneDst)) {
    fs.rmSync(standaloneDst, { recursive: true, force: true });
  }
  copyRecursive(standaloneSrc, standaloneDst);
  console.log("[after-pack] OK");
};
