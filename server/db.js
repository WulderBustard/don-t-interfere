const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const DB_FILE = process.env.DB_FILE
  ? path.resolve(__dirname, process.env.DB_FILE)
  : path.join(__dirname, "db", "data.sqlite");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";

const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_FILE);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((item) => item.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  mic_muted INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  last_seen TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('text','voice')),
  owner_username TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  user TEXT,
  text TEXT,
  time TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(channel_id) REFERENCES channels(id) ON DELETE CASCADE
);
`);

ensureColumn("users", "avatar_url", "TEXT");
ensureColumn("users", "status", "TEXT NOT NULL DEFAULT 'offline'");
ensureColumn("users", "mic_muted", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "is_admin", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "last_seen", "TEXT");
ensureColumn("channels", "owner_username", "TEXT");
ensureColumn("messages", "created_at", "TEXT");

db.prepare("UPDATE users SET status = 'online' WHERE status = 'idle'").run();

const adminPasswordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
const existingAdmin = db.prepare("SELECT id FROM users WHERE username = ?").get(ADMIN_USERNAME);
if (existingAdmin) {
  db.prepare("UPDATE users SET password = ?, is_admin = 1 WHERE username = ?").run(adminPasswordHash, ADMIN_USERNAME);
} else {
  db.prepare(
    "INSERT INTO users (username, password, status, mic_muted, is_admin, last_seen) VALUES (?, ?, 'offline', 0, 1, ?)"
  ).run(ADMIN_USERNAME, adminPasswordHash, new Date().toISOString());
}

db.prepare(`
  UPDATE messages
  SET created_at = replace(created_at, ' ', 'T') || '.000Z'
  WHERE created_at IS NOT NULL
    AND created_at NOT LIKE '%T%'
    AND created_at GLOB '????-??-?? ??:??:*'
`).run();

db.prepare(`
  UPDATE messages
  SET created_at = COALESCE(
    created_at,
    CASE
      WHEN time GLOB '[0-9][0-9]:[0-9][0-9]' THEN date('now') || 'T' || time || ':00.000Z'
      ELSE strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    END
  )
  WHERE created_at IS NULL
`).run();

module.exports = {
  getAllChannels() {
    const stmt = db.prepare("SELECT id, name, type, owner_username, created_at FROM channels ORDER BY id");
    return stmt.all();
  },

  getChannel(id) {
    const stmt = db.prepare("SELECT id, name, type, owner_username, created_at FROM channels WHERE id = ?");
    return stmt.get(id);
  },

  createChannel(name, type, ownerUsername) {
    const insert = db.prepare("INSERT INTO channels (name, type, owner_username) VALUES (?, ?, ?)");
    const info = insert.run(name, type, ownerUsername);
    return { id: info.lastInsertRowid, name, type, owner_username: ownerUsername };
  },

  deleteChannel(id) {
    const stmt = db.prepare("DELETE FROM channels WHERE id = ?");
    const info = stmt.run(id);
    return info.changes > 0;
  },

  getMessages(channelId) {
    const stmt = db.prepare(
      "SELECT id, user, text, time, created_at FROM messages WHERE channel_id = ? ORDER BY created_at, id"
    );
    return stmt.all(channelId);
  },

  addMessage(channelId, user, text, time, createdAt) {
    const stmt = db.prepare(
      "INSERT INTO messages (channel_id, user, text, time, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    const info = stmt.run(channelId, user, text, time, createdAt);
    return { id: info.lastInsertRowid, channel_id: channelId, user, text, time, created_at: createdAt };
  },

  getUser(username) {
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    return stmt.get(username);
  },

  getAllUsers() {
    const stmt = db.prepare(
      "SELECT id, username, avatar_url, status, mic_muted, is_admin, last_seen, created_at FROM users ORDER BY is_admin DESC, username ASC"
    );
    return stmt.all();
  },

  createUser(username, passwordHash) {
    const stmt = db.prepare(
      "INSERT INTO users (username, password, status, mic_muted, last_seen) VALUES (?, ?, 'online', 0, ?)"
    );
    const now = new Date().toISOString();
    const info = stmt.run(username, passwordHash, now);
    return { id: info.lastInsertRowid, username, avatar_url: null, status: "online", mic_muted: 0, is_admin: 0, last_seen: now };
  },

  getPublicUser(username) {
    const stmt = db.prepare(
      "SELECT id, username, avatar_url, status, mic_muted, is_admin, last_seen, created_at FROM users WHERE username = ?"
    );
    return stmt.get(username);
  },

  deleteUser(username) {
    const user = this.getPublicUser(username);
    if (!user || user.is_admin) return null;

    db.prepare("DELETE FROM users WHERE username = ? AND is_admin = 0").run(username);
    return user;
  },

  deleteNonAdminUsers() {
    return db.prepare("DELETE FROM users WHERE is_admin = 0").run().changes;
  },

  updateUserPresence(username, { status, micMuted }) {
    const allowedStatuses = new Set(["online", "offline"]);
    const current = this.getPublicUser(username);
    if (!current) return null;

    const nextStatus = allowedStatuses.has(status) ? status : current.status;
    const nextMicMuted = typeof micMuted === "boolean" ? (micMuted ? 1 : 0) : current.mic_muted;
    const lastSeen = new Date().toISOString();

    db.prepare(
      "UPDATE users SET status = ?, mic_muted = ?, last_seen = ? WHERE username = ?"
    ).run(nextStatus, nextMicMuted, lastSeen, username);

    return this.getPublicUser(username);
  },

  updateUserAvatar(username, avatarUrl) {
    db.prepare("UPDATE users SET avatar_url = ? WHERE username = ?").run(avatarUrl, username);
    return this.getPublicUser(username);
  },

  getAvatarPath(username) {
    const stmt = db.prepare("SELECT avatar_url FROM users WHERE username = ?");
    return stmt.get(username)?.avatar_url || null;
  },

  markUserOffline(username) {
    const lastSeen = new Date().toISOString();
    db.prepare("UPDATE users SET status = 'offline', last_seen = ? WHERE username = ?").run(lastSeen, username);
    return this.getPublicUser(username);
  },

  createUserLegacy(username, passwordHash) {
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const info = stmt.run(username, passwordHash);
    return { id: info.lastInsertRowid, username };
  },
};
