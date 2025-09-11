const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("bank.db");

// Ensure table exists
db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, coins INTEGER)");

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
    () => {
      if (callback) callback();
    }
  );
}

function addCoins(userID, amount, callback) {
  getCoins(userID, (coins) => {
    setCoins(userID, coins + amount, callback);
  });
}

module.exports.config = {
  name: "bank",
  version: "1.0.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Bank system",
  usePrefix: true,
  commandCategory: "economy",
  usages: "/bank, /bank send @id <amount>",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // Every message gives +5 coins
  addCoins(senderID, 5);

  if (!args[0]) {
    getCoins(senderID, (coins) => {
      api.sendMessage(`💰 You have ${coins} coins.`, threadID, messageID);
    });
  }

  // Send coins
  if (args[0] === "send" && args[1] && args[2]) {
    const mentionID = args[1].replace("@", "");
    const amount = parseInt(args[2]);

    if (isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Invalid amount.", threadID, messageID);
    }

    getCoins(senderID, (coins) => {
      if (coins < amount) {
        return api.sendMessage("⚠️ Not enough coins.", threadID, messageID);
      }
      setCoins(senderID, coins - amount);
      addCoins(mentionID, amount);
      api.sendMessage(
        `✅ Sent ${amount} coins to ${mentionID}`,
        threadID,
        messageID
      );
    });
  }
};
