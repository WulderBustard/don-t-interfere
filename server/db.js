const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const DB_FILE = process.env.DB_FILE || path.join(__dirname, "db", "data.sqlite");

// ensure folder exists
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_FILE);

// Создаём таблицы, если их нет
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('text','voice')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user TEXT,
    text TEXT,
    time TEXT,
    FOREIGN KEY(channel_id) REFERENCES channels(id) ON DELETE CASCADE
  );
`);

module.exports = {
  getAllChannels() {
    const stmt = db.prepare("SELECT id, name, type, created_at FROM channels ORDER BY id");
    return stmt.all();
  },

  createChannel(name, type) {
    const insert = db.prepare("INSERT INTO channels (name, type) VALUES (?, ?)");
    const info = insert.run(name, type);
    return { id: info.lastInsertRowid, name, type };
  },

  deleteChannel(id) {
    const stmt = db.prepare("DELETE FROM channels WHERE id = ?");
    const info = stmt.run(id);
    return info.changes > 0;
  },

  getMessages(channelId) {
    const stmt = db.prepare("SELECT id, user, text, time FROM messages WHERE channel_id = ? ORDER BY id");
    return stmt.all(channelId);
  },

  addMessage(channelId, user, text, time) {
    const stmt = db.prepare("INSERT INTO messages (channel_id, user, text, time) VALUES (?, ?, ?, ?)");
    const info = stmt.run(channelId, user, text, time);
    return { id: info.lastInsertRowid, channel_id: channelId, user, text, time };
  },

  // === Users ===
  getUser(username) {
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    return stmt.get(username);
  },

  createUser(username, passwordHash) {
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const info = stmt.run(username, passwordHash);
    return { id: info.lastInsertRowid, username };
  }
};
