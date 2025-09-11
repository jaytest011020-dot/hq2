const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("bank.db");

// 🔹 Create table kung wala pa
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS bank (userID TEXT PRIMARY KEY, balance INTEGER)");
});

function getBalance(userID, callback) {
  db.get("SELECT balance FROM bank WHERE userID = ?", [userID], (err, row) => {
    if (err) return callback(err);
    callback(null, row ? row.balance : 0);
  });
}

function updateBalance(userID, amount, callback) {
  getBalance(userID, (err, balance) => {
    if (err) return callback(err);

    const newBalance = balance + amount;
    db.run("INSERT INTO bank (userID, balance) VALUES (?, ?) ON CONFLICT(userID) DO UPDATE SET balance = ?", 
      [userID, newBalance, newBalance], callback);
  });
}

module.exports.config = {
  name: "bank",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Jaz + ChatGPT",
  description: "Bank system with SQLite",
  commandCategory: "game",
  usages: "/bank send @mention <amount>",
  cooldowns: 0
};

// 🔹 Every message = +5 coins
module.exports.handleEvent = function({ event }) {
  const { senderID } = event;
  if (!senderID) return;

  updateBalance(senderID, 5, () => {});
};

// 🔹 Bank commands
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, mentions, senderID } = event;

  if (args.length === 0) {
    getBalance(senderID, (err, balance) => {
      if (err) return api.sendMessage("⚠️ DB error", threadID, messageID);
      api.sendMessage(`💰 Your balance: ${balance} coins`, threadID, messageID);
    });
    return;
  }

  if (args[0].toLowerCase() === "send") {
    if (!mentions || Object.keys(mentions).length === 0) {
      return api.sendMessage("❌ You must mention a user to send coins.", threadID, messageID);
    }

    const targetID = Object.keys(mentions)[0];
    const amount = parseInt(args[1]);

    if (isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Invalid amount.", threadID, messageID);
    }

    getBalance(senderID, (err, balance) => {
      if (err) return api.sendMessage("⚠️ DB error", threadID, messageID);

      if (balance < amount) {
        return api.sendMessage("❌ Not enough coins.", threadID, messageID);
      }

      // Deduct from sender
      updateBalance(senderID, -amount, () => {
        // Add to receiver
        updateBalance(targetID, amount, () => {
          api.sendMessage(
            `✅ You sent ${amount} coins to ${mentions[targetID].replace(/@/g,"")}\n💰 Your balance: ${balance - amount} coins`,
            threadID,
            messageID
          );
        });
      });
    });
  }
};
