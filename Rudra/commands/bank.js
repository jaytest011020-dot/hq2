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
  name: "bank",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "YourName",
  description: "Bank system for game",
  commandCategory: "game",
  usages: "/bank send @mention <amount>",
  cooldowns: 0
};

// 🔹 Auto earn coins kada message
module.exports.handleEvent = function({ event }) {
  const { senderID } = event;
  if (!senderID) return;

  const bank = loadBank();
  if (!bank[senderID]) bank[senderID] = 0;

  bank[senderID] += 5; // 5 coins per message
  saveBank(bank);
};

// 🔹 Bank command
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, mentions, senderID } = event;
  const bank = loadBank();

  if (args.length === 0) {
    const balance = bank[senderID] || 0;
    return api.sendMessage(`💰 Your balance: ${balance} coins`, threadID, messageID);
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

    if ((bank[senderID] || 0) < amount) {
      return api.sendMessage("❌ Not enough coins.", threadID, messageID);
    }

    if (!bank[targetID]) bank[targetID] = 0;

    bank[senderID] -= amount;
    bank[targetID] += amount;
    saveBank(bank);

    return api.sendMessage(
      `✅ You sent ${amount} coins to ${mentions[targetID].replace(/@/g,"")}\n💰 Your balance: ${bank[senderID]} coins`,
      threadID,
      messageID
    );
  }
};
