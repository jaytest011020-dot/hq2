// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database file
const dbPath = path.resolve(__dirname, "database.sqlite");

// Connect to SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to connect to database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database:", dbPath);
  }
});

// ---------------- CREATE TABLES ----------------
db.serialize(() => {
  // Bank system
  db.run(`
    CREATE TABLE IF NOT EXISTS bank (
      user_id TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0
    )
  `);

  // Redeem shop (available pets/items)
  db.run(`
    CREATE TABLE IF NOT EXISTS redeem (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_name TEXT UNIQUE,
      price INTEGER
    )
  `);

  // Track redeemed pets per user
  db.run(`
    CREATE TABLE IF NOT EXISTS user_pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      pet_name TEXT NOT NULL,
      redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Scammer list
  db.run(`
    CREATE TABLE IF NOT EXISTS scammers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fb_link TEXT NOT NULL UNIQUE
    )
  `);
});

// Export database
module.exports = { db };
