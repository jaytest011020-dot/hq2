// db.js - Unified Database for all modules
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("bot.db");

// ------------------ TABLES ------------------

// Users table (for coins/bank)
db.run(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  coins INTEGER DEFAULT 0
)`);

// Bets table (for /bet history)
db.run(`CREATE TABLE IF NOT EXISTS bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  amount INTEGER,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Slots table (for /slot history)
db.run(`CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  bet INTEGER,
  result TEXT,
  win INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Redeemable pets (for /redeem)
db.run(`CREATE TABLE IF NOT EXISTS redeem (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_name TEXT UNIQUE,
  price INTEGER
)`);

// Scammers table (for /addscam and /scam)
db.run(`CREATE TABLE IF NOT EXISTS scammers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  fb_link TEXT
)`);

// ------------------ HELPERS ------------------
function getCoins(userID, callback) {
  db.get("SELECT coins FROM users WHERE id = ?", [userID], (err, row) => {
    if (err) return callback(0);
    if (!row) {
      db.run("INSERT INTO users (id, coins) VALUES (?, ?)", [userID, 0]);
      return callback(0);
    }
    callback(row.coins);
  });
}

function setCoins(userID, amount, callback) {
  db.run(
    "INSERT INTO users (id, coins) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET coins = ?",
    [userID, amount, amount],
    () => { if (callback) callback(); }
  );
}

// ------------------ EXPORT ------------------
module.exports = {
  db,
  getCoins,
  setCoins
};
