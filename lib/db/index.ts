import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

function resolveDataDir(): string {
  // Electron passa DASHBOARD_DATA_PATH como app.getPath('userData').
  // Em dev, usa pasta data/ relativa ao projeto.
  const fromEnv = process.env.DASHBOARD_DATA_PATH;
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "data");
}

const DATA_DIR = resolveDataDir();
const DB_PATH = path.join(DATA_DIR, "dashboard.db");

let _client: Client | null = null;
let _initialized = false;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function db(): Client {
  if (_client) return _client;
  ensureDataDir();
  _client = createClient({ url: `file:${DB_PATH}` });
  return _client;
}

export async function initDb() {
  if (_initialized) return;
  const c = db();
  await c.executeMultiple(SCHEMA_SQL);
  _initialized = true;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  items_synced INTEGER DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_source_started ON sync_log(source, started_at DESC);

CREATE TABLE IF NOT EXISTS github_contributions (
  date TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_github_contributions_date ON github_contributions(date DESC);

CREATE TABLE IF NOT EXISTS github_repo_stats (
  date TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  commits INTEGER NOT NULL DEFAULT 0,
  prs INTEGER NOT NULL DEFAULT 0,
  issues INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, repo_name)
);

CREATE TABLE IF NOT EXISTS trello_tasks_completed (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  board_id TEXT NOT NULL,
  board_name TEXT,
  list_id TEXT NOT NULL,
  list_name TEXT,
  completed_at TEXT NOT NULL,
  url TEXT,
  raw_action_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_trello_tasks_completed_at ON trello_tasks_completed(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trello_tasks_board ON trello_tasks_completed(board_id);
`;
