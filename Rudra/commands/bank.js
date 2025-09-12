// bank.js
const { db } = require("./db");

module.exports.config = {
  name: "bank",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Bank system",
  commandCategory: "economy",
  usages: "/bank, /bank send @id <amount>, /bank all",
  cooldowns: 3
};

function getBalance(userID, callback) {
  db.get("SELECT balance FROM bank WHERE user_id = ?", [userID], (err, row) => {
    if (err) {
      console.error("❌ getBalance error:", err.message);
      return callback(0);
    }
    if (!row) {
      db.run("INSERT INTO bank (user_id, balance) VALUES (?, 0)", [userID], (err) => {
        if (err) console.error("❌ Insert error:", err.message);
        callback(0);
      });
      return;
    }
    callback(row.balance);
  });
}

function setBalance(userID, amount, callback) {
  db.run(
    `INSERT INTO bank (user_id, balance) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance`,
    [userID, amount],
    (err) => {
      if (err) console.error("❌ setBalance error:", err.message);
      if (callback) callback();
    }
  );
}

function addCoins(userID, amount, callback) {
  getBalance(userID, (coins) => setBalance(userID, coins + amount, callback));
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  // Give +5 coins for every message
  addCoins(senderID, 5);

  if (!args[0]) {
    return getBalance(senderID, (coins) =>
      api.sendMessage(`💰 You have ${coins} coins.`, threadID, messageID)
    );
  }

  if (args[0] === "send" && args[1] && args[2]) {
    const mentionID = args[1].replace("@", "");
    const amount = parseInt(args[2]);

    if (isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Invalid amount.", threadID, messageID);
    }

    getBalance(senderID, (coins) => {
      if (coins < amount) {
        return api.sendMessage("⚠️ Not enough coins.", threadID, messageID);
      }
      setBalance(senderID, coins - amount, () => {
        addCoins(mentionID, amount, () => {
          api.sendMessage(`✅ Sent ${amount} coins to ${mentionID}`, threadID, messageID);
        });
      });
    });
  }

  if (args[0] === "all") {
    db.all("SELECT user_id, balance FROM bank", [], (err, rows) => {
      if (err) {
        console.error("❌ Fetch all error:", err.message);
        return;
      }
      let msg = "💰 Bank Balances:\n";
      rows.forEach((r) => {
        msg += `${r.user_id}: ${r.balance}\n`;
      });
      api.sendMessage(msg, threadID, messageID);
    });
  }
};
