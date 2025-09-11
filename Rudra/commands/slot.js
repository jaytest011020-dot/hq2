const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.sqlite");

// Ensure bank table exists
db.run("CREATE TABLE IF NOT EXISTS bank (user_id TEXT PRIMARY KEY, balance INTEGER)");

function getBalance(userID, callback) {
  db.get("SELECT balance FROM bank WHERE user_id = ?", [userID], (err, row) => {
    if (err) return callback(0);
    if (!row) {
      db.run("INSERT INTO bank (user_id, balance) VALUES (?, ?)", [userID, 0]);
      return callback(0);
    }
    callback(row.balance);
  });
}

function setBalance(userID, amount, callback) {
  db.run(
    "INSERT INTO bank (user_id, balance) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = ?",
    [userID, amount, amount],
    () => callback && callback()
  );
}

module.exports.config = {
  name: "slot",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Slot machine game to gamble coins",
  commandCategory: "economy",
  usages: "/slot <amount>",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const bet = parseInt(args[0]);

  if (isNaN(bet) || bet <= 0) return api.sendMessage("❌ Enter a valid bet amount.", threadID, messageID);

  getBalance(senderID, (balance) => {
    if (balance < bet) return api.sendMessage("⚠️ Not enough coins.", threadID, messageID);

    // Deduct bet first
    setBalance(senderID, balance - bet);

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

    // Add winnings
    if (win > 0) setBalance(senderID, balance - bet + win);

    const result = `🎰 Slot Machine 🎰\n\n[ ${spin.join(" | ")} ]\n\n${
      win > 0 ? `🎉 You won ${win} coins!` : `❌ You lost ${bet} coins.`
    }\n💰 Your balance: ${win > 0 ? balance - bet + win : balance - bet} coins`;

    api.sendMessage(result, threadID, messageID);
  });
};
