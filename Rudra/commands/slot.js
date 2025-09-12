const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("bot.db"); // unified DB

// ------------------ TABLES ------------------

// Ensure users table exists
db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, coins INTEGER)");

// Ensure slots history table exists
db.run(`CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  bet INTEGER,
  result TEXT,
  win INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

function addSlotHistory(userID, bet, spin, win) {
  db.run(
    "INSERT INTO slots (user_id, bet, result, win) VALUES (?, ?, ?, ?)",
    [userID, bet, spin.join(" | "), win]
  );
}

// ------------------ MODULE CONFIG ------------------
module.exports.config = {
  name: "slot",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Slot machine game to gamble coins",
  commandCategory: "economy",
  usages: "/slot <amount>",
  cooldowns: 5
};

// ------------------ MAIN RUN ------------------
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const bet = parseInt(args[0]);

  if (isNaN(bet) || bet <= 0) {
    return api.sendMessage("❌ Enter a valid bet amount.", threadID, messageID);
  }

  getCoins(senderID, (coins) => {
    if (coins < bet) {
      return api.sendMessage("⚠️ Not enough coins.", threadID, messageID);
    }

    // Slot symbols
    const symbols = ["🍒", "🍋", "🍉", "🍇", "⭐", "💎"];
    const spin = [];
    for (let i = 0; i < 3; i++) {
      spin.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }

    // Determine winnings
    let win = 0;
    if (spin[0] === spin[1] && spin[1] === spin[2]) {
      win = bet * 5; // jackpot
    } else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) {
      win = bet * 2; // two match
    }

    const finalCoins = coins - bet + win;

    // Save balance + history
    setCoins(senderID, finalCoins, () => {
      addSlotHistory(senderID, bet, spin, win);
      const result = `🎰 Slot Machine 🎰\n\n[ ${spin.join(" | ")} ]\n\n${
        win > 0 ? `🎉 You won ${win} coins!` : `❌ You lost ${bet} coins.`
      }\n💰 Your balance: ${finalCoins} coins`;
      api.sendMessage(result, threadID, messageID);
    });
  });
};
