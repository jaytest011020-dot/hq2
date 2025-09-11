const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Unified bot database
const db = new sqlite3.Database(path.join(__dirname, "bot.db"));

// Ensure scammers table exists
db.run(`
  CREATE TABLE IF NOT EXISTS scammers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    fb_link TEXT
  )
`);

// Ensure users table exists for coins
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    coins INTEGER
  )
`);

// Ensure checktt table exists
db.run(`
  CREATE TABLE IF NOT EXISTS checktt (
    threadID TEXT,
    userID TEXT,
    count INTEGER,
    PRIMARY KEY (threadID, userID)
  )
`);

// Ensure redeem table exists
db.run(`
  CREATE TABLE IF NOT EXISTS redeem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_name TEXT UNIQUE,
    price INTEGER
  )
`);

module.exports = { db };
