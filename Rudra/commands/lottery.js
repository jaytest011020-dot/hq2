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
  name: "lottery",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Lottery game to gamble coins",
  commandCategory: "economy",
  usages: "/lottery <bet>",
  cooldowns: 5
};

// Helper to generate 3-digit number as string
function generateTicket() {
  return Math.floor(Math.random() * 900 + 100).toString(); // 100–999
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const bet = parseInt(args[0]);

  if (isNaN(bet) || bet <= 0) return api.sendMessage("❌ Enter a valid bet amount.", threadID, messageID);

  getBalance(senderID, (balance) => {
    if (balance < bet) return api.sendMessage("⚠️ Not enough coins.", threadID, messageID);

    // Deduct bet
    setBalance(senderID, balance - bet);

    const userTicket = generateTicket();
    const winningTicket = generateTicket();

    // Count matches
    let matchCount = 0;
    for (let i = 0; i < 3; i++) {
      if (userTicket[i] === winningTicket[i]) matchCount++;
    }

    // Determine prize
    let prize = 0;
    if (matchCount === 3) prize = bet * 10;
    else if (matchCount === 2) prize = bet * 3;
    else if (matchCount === 1) prize = bet * 2;

    if (prize > 0) setBalance(senderID, balance - bet + prize);

    const result = `🎟️ Lottery 🎟️\n\nYour ticket: ${userTicket}\nWinning ticket: ${winningTicket}\n\n${
      prize > 0 ? `🎉 You won ${prize} coins!` : `❌ No match, you lost ${bet} coins.`
    }\n💰 Your balance: ${prize > 0 ? balance - bet + prize : balance - bet} coins`;

    api.sendMessage(result, threadID, messageID);
  });
};
