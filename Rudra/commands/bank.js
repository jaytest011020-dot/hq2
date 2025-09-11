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
  version: "1.1.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Bank system with coins",
  usePrefix: true,
  commandCategory: "economy",
  usages: "/bank, /bank send @id <amount>, /bank all",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID } = event;

  // Every message gives +5 coins
  addCoins(senderID, 5);

  // Default - check own balance
  if (!args[0]) {
    getCoins(senderID, (coins) => {
      api.sendMessage(`💰 You have ${coins} coins.`, threadID, messageID);
    });
    return;
  }

  // Show all balances
  if (args[0] === "all") {
    db.all("SELECT id, coins FROM users ORDER BY coins DESC", async (err, rows) => {
      if (err) return api.sendMessage("⚠️ Error fetching balances.", threadID, messageID);
      if (!rows || rows.length === 0) return api.sendMessage("📭 No users found.", threadID, messageID);

      let msg = "🏦 Bank Leaderboard:\n";
      let count = 1;
      for (const row of rows) {
        let name = await Users.getNameUser(row.id).catch(() => row.id);
        msg += `${count++}. ${name}: ${row.coins} coins\n`;
      }
      api.sendMessage(msg, threadID, messageID);
    });
    return;
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
      setCoins(senderID, coins - amount, () => {
        addCoins(mentionID, amount, () => {
          api.sendMessage(
            `✅ Sent ${amount} coins to ${mentionID}`,
            threadID,
            messageID
          );
        });
      });
    });
    return;
  }

  api.sendMessage("❌ Invalid command. Use /bank, /bank send @id <amount>, or /bank all", threadID, messageID);
};
