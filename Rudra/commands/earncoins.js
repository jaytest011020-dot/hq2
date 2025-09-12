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
  name: "earncoins",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Earn 5 coins every message",
  commandCategory: "Economy",
  usages: "Passive (every message)",
  cooldowns: 0,
};

// Give 5 coins on each message
module.exports.handleEvent = function ({ event }) {
  const { senderID } = event;
  if (!senderID) return;

  const bank = loadBank();
  if (!bank[senderID]) bank[senderID] = { balance: 0 };

  bank[senderID].balance += 5;
  saveBank(bank);
};
