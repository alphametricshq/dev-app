// Copia .next/static (e public/ se existir) para dentro de .next/standalone/
// O Next.js gera o standalone sem esses assets — precisam ser copiados manualmente.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

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

const staticSrc = path.join(root, ".next", "static");
const staticDst = path.join(standalone, ".next", "static");
console.log(`[copy-standalone] static -> ${staticDst}`);
copyRecursive(staticSrc, staticDst);

const publicSrc = path.join(root, "public");
const publicDst = path.join(standalone, "public");
if (fs.existsSync(publicSrc)) {
  console.log(`[copy-standalone] public -> ${publicDst}`);
  copyRecursive(publicSrc, publicDst);
}

console.log("[copy-standalone] OK");
