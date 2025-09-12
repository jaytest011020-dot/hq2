const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "bank.json");

// Load bank
function loadBank() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return {};
  }
}

// Save bank
function saveBank(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

module.exports.config = {
  name: "slot",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Play slot machine with coins",
  commandCategory: "Games",
  usages: "/slot <amount>",
  cooldowns: 5,
};

// Slot symbols
const symbols = ["🍒", "🍋", "🍇", "🍀", "⭐", "💎"];

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  const bank = loadBank();

  if (!bank[senderID]) bank[senderID] = { balance: 0 };

  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) {
    return api.sendMessage("❌ Usage: /slot <bet>", threadID);
  }

  if (bank[senderID].balance < bet) {
    return api.sendMessage("⚠️ You don't have enough coins!", threadID);
  }

  // Deduct bet
  bank[senderID].balance -= bet;

  // Roll slots
  const roll = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  let resultMsg = `🎰 SLOT MACHINE 🎰\n[ ${roll.join(" | ")} ]\n\n`;

  // Check winnings
  if (roll[0] === roll[1] && roll[1] === roll[2]) {
    const win = bet * 5;
    bank[senderID].balance += win;
    resultMsg += `✨ JACKPOT! 3 in a row! You won 💰 ${win.toLocaleString()} coins.`;
  } else if (roll[0] === roll[1] || roll[1] === roll[2] || roll[0] === roll[2]) {
    const win = bet * 2;
    bank[senderID].balance += win;
    resultMsg += `✅ 2 matches! You won 💰 ${win.toLocaleString()} coins.`;
  } else {
    resultMsg += `❌ You lost your bet of ${bet.toLocaleString()} coins.`;
  }

  saveBank(bank);

  const name = await Users.getNameUser(senderID);
  resultMsg += `\n\n👤 ${name}\n💳 Balance: ${bank[senderID].balance.toLocaleString()} coins`;

  return api.sendMessage(resultMsg, threadID);
};
