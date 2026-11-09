import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbFile = process.env.DB_FILE || path.join(dataDir, 'crm.sqlite');
export const db = new Database(dbFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    email      TEXT,
    phone      TEXT,
    company    TEXT,
    status     TEXT    NOT NULL DEFAULT 'lead'
                 CHECK (status IN ('lead','prospect','customer','inactive')),
    notes      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    value       REAL    NOT NULL DEFAULT 0 CHECK (value >= 0),
    stage       TEXT    NOT NULL DEFAULT 'new'
                  CHECK (stage IN ('new','contacted','qualified','proposal','won','lost')),
    expected_close TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activities (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id    INTEGER REFERENCES deals(id) ON DELETE SET NULL,
    type       TEXT    NOT NULL CHECK (type IN ('call','email','meeting','task','note')),
    subject    TEXT    NOT NULL,
    due_date   TEXT,
    done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0,1)),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_id);
  CREATE INDEX IF NOT EXISTS idx_deals_owner    ON deals(owner_id);
  CREATE INDEX IF NOT EXISTS idx_deals_contact  ON deals(contact_id);
  CREATE INDEX IF NOT EXISTS idx_activities_owner ON activities(owner_id);
  CREATE INDEX IF NOT EXISTS idx_activities_due   ON activities(owner_id, done, due_date);
`);
