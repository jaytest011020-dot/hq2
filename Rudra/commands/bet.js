const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("bot.db"); // All-in-one DB

// Ensure users table exists
db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, coins INTEGER)");

// Ensure bets table exists (history)
db.run(`CREATE TABLE IF NOT EXISTS bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  amount INTEGER,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Helper functions
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

function addBet(userID, amount, result) {
  db.run("INSERT INTO bets (user_id, amount, result) VALUES (?, ?, ?)", [userID, amount, result]);
}

module.exports.config = {
  name: "bet",
  version: "2.0.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Bet coins (40% win / 60% lose) with persistent DB",
  usePrefix: true,
  commandCategory: "economy",
  usages: "/bet <amount>",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount <= 0) {
    return api.sendMessage("❌ Invalid amount. Example: /bet 100", threadID, messageID);
  }

  getCoins(senderID, (coins) => {
    if (coins < amount) {
      return api.sendMessage("⚠️ You don’t have enough coins.", threadID, messageID);
    }

    const win = Math.random() < 0.4; // 40% win
    if (win) {
      const newCoins = coins + amount;
      setCoins(senderID, newCoins, () => {
        addBet(senderID, amount, "WIN");
        api.sendMessage(`🎉 You WON! Now you have ${newCoins} coins.`, threadID, messageID);
      });
    } else {
      const newCoins = coins - amount;
      setCoins(senderID, newCoins, () => {
        addBet(senderID, amount, "LOSE");
        api.sendMessage(`😢 You LOST! Now you have ${newCoins} coins.`, threadID, messageID);
      });
    }
  });
};
