const fs = require("fs");
const path = require("path");
const bankFile = path.join(__dirname, "bank.json");

// Load balances
function loadBank() {
  if (!fs.existsSync(bankFile)) {
    fs.writeFileSync(bankFile, JSON.stringify({}), "utf-8");
  }
  return JSON.parse(fs.readFileSync(bankFile, "utf-8"));
}

// Save balances
function saveBank(data) {
  fs.writeFileSync(bankFile, JSON.stringify(data, null, 2), "utf-8");
}

module.exports.config = {
  name: "bet",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "YourName",
  description: "Bet coins 50% chance win or lose",
  commandCategory: "game",
  usages: "/bet <amount>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const bank = loadBank();

  if (!args[0]) {
    const balance = bank[senderID] || 0;
    return api.sendMessage(`💰 Your balance: ${balance} coins`, threadID, messageID);
  }

  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount <= 0) {
    return api.sendMessage("❌ Invalid bet amount.", threadID, messageID);
  }

  if ((bank[senderID] || 0) < amount) {
    return api.sendMessage("❌ Not enough coins to bet.", threadID, messageID);
  }

  // 50% chance
  const win = Math.random() < 0.5;

  if (win) {
    bank[senderID] += amount; // double bet as reward
    saveBank(bank);
    return api.sendMessage(`🎉 You won! You gained ${amount} coins.\n💰 Balance: ${bank[senderID]} coins`, threadID, messageID);
  } else {
    bank[senderID] -= amount;
    saveBank(bank);
    return api.sendMessage(`😢 You lost ${amount} coins.\n💰 Balance: ${bank[senderID]} coins`, threadID, messageID);
  }
};
