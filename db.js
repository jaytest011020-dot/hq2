// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// For Render or other cloud hosts, use persistent folder
const dbPath = process.env.RENDER ? "/data/bot.db" : path.join(__dirname, "bot.db");
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  // Bank / Coins
  db.run(`CREATE TABLE IF NOT EXISTS bank (
    user_id TEXT PRIMARY KEY,
    balance INTEGER
  )`);

  // Scammer List
  db.run(`CREATE TABLE IF NOT EXISTS scammers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    fb_link TEXT
  )`);

  // Message Counts / CheckTT
  db.run(`CREATE TABLE IF NOT EXISTS message_counts (
    thread_id TEXT,
    user_id TEXT,
    count INTEGER,
    PRIMARY KEY(thread_id, user_id)
  )`);

  // Redeem / Pets
  db.run(`CREATE TABLE IF NOT EXISTS pets (
    name TEXT PRIMARY KEY,
    price INTEGER
  )`);
});

module.exports = { db };
