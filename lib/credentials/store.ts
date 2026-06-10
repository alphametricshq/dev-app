import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";

export type Credentials = {
  GITHUB_USERNAME?: string;
  GITHUB_TOKEN?: string;
  GITHUB_PROJECT_TOKEN?: string;
  TRELLO_API_KEY?: string;
  TRELLO_TOKEN?: string;
  TRELLO_DONE_LIST_IDS?: string;
  SYNC_INTERVAL_MIN?: string;
};

export const CREDENTIAL_KEYS: (keyof Credentials)[] = [
  "GITHUB_USERNAME",
  "GITHUB_TOKEN",
  "GITHUB_PROJECT_TOKEN",
  "TRELLO_API_KEY",
  "TRELLO_TOKEN",
  "TRELLO_DONE_LIST_IDS",
  "SYNC_INTERVAL_MIN",
];

function dataDir(): string {
  // Electron passa DASHBOARD_DATA_PATH como app.getPath('userData')
  // Em dev/standalone, usa pasta no home do usuario
  const fromEnv = process.env.DASHBOARD_DATA_PATH;
  if (fromEnv) return fromEnv;
  return path.join(os.homedir(), ".dopamine-dashboard");
}

function credentialsFile(): string {
  return path.join(dataDir(), "credentials.enc.json");
}

function deriveKey(): Buffer {
  // Chave derivada de info da maquina + salt fixo. Nao eh "seguranca de banco"
  // mas evita o token aparecer em texto plano e amarra ao usuario+maquina.
  const seed = `${os.hostname()}::${os.userInfo().username}::dopamine-v1`;
  return crypto.createHash("sha256").update(seed).digest();
}

let cache: Credentials | null = null;
let cacheMtime = 0;

export function loadCredentials(): Credentials {
  const file = credentialsFile();
  if (!fs.existsSync(file)) {
    cache = {};
    return cache;
  }
  try {
    const stat = fs.statSync(file);
    if (cache && stat.mtimeMs === cacheMtime) return cache;
    const raw = fs.readFileSync(file);
    const obj = JSON.parse(raw.toString());
    const iv = Buffer.from(obj.iv, "hex");
    const tag = Buffer.from(obj.tag, "hex");
    const encrypted = Buffer.from(obj.data, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    cache = JSON.parse(decrypted.toString()) as Credentials;
    cacheMtime = stat.mtimeMs;
    return cache;
  } catch {
    cache = {};
    return cache;
  }
}

export function saveCredentials(creds: Credentials): void {
  const dir = dataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(creds), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = JSON.stringify({
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
  });
  fs.writeFileSync(credentialsFile(), payload, { mode: 0o600 });
  cache = { ...creds };
  cacheMtime = fs.statSync(credentialsFile()).mtimeMs;
}

/**
 * Le credencial. Prioridade: env var > arquivo criptografado.
 * Permite override via .env.local em dev sem precisar editar o JSON.
 */
export function getCredential(key: keyof Credentials): string | undefined {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;
  const stored = loadCredentials();
  const v = stored[key];
  return v == null || v === "" ? undefined : String(v);
}
