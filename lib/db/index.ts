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

CREATE TABLE IF NOT EXISTS pinned_cards (
  card_id TEXT PRIMARY KEY,
  board_id TEXT,
  card_name TEXT,
  list_name TEXT,
  url TEXT,
  pinned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pinned_cards_at ON pinned_cards(pinned_at DESC);

CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✨',
  color TEXT NOT NULL DEFAULT 'accent',
  target_per_week INTEGER NOT NULL DEFAULT 7,
  archived INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (habit_id, date),
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(archived, position);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'focus',
  duration_min INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT NOT NULL DEFAULT (datetime('now')),
  card_id TEXT,
  card_name TEXT,
  completed INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_pomodoro_finished_at ON pomodoro_sessions(finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_pomodoro_type ON pomodoro_sessions(type);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_created ON journal_entries(created_at DESC);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('card', 'habit')),
  name TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type, name);
`;
