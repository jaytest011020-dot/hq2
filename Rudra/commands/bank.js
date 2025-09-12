const fs = require("fs");
const path = require("path");

// Path to JSON file
const dataFile = path.join(__dirname, "bank.json");

// Ensure file exists
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({}, null, 2), "utf8");
}

// Load data
function loadBank() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return {};
  }
}

// Save data
function saveBank(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

module.exports.config = {
  name: "bank",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Simple bank system to store coins (+ earn 5 coins per message)",
  commandCategory: "Economy",
  usages: "/bank or /bank all",
  cooldowns: 3,
};

// Format balance with style
function formatBalance(user, balance) {
  return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

// 🔹 Add 5 coins per message
module.exports.handleEvent = function ({ event }) {
  const { senderID } = event;
  if (!senderID) return;

  const bank = loadBank();
  if (!bank[senderID]) bank[senderID] = { balance: 0 };

  bank[senderID].balance += 5; // earn 5 coins each message
  saveBank(bank);
};

// 🔹 Run command
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  const bank = loadBank();

  // Ensure user exists in bank
  if (!bank[senderID]) bank[senderID] = { balance: 0 };
  saveBank(bank);

  const command = args[0]?.toLowerCase();

  // Show all accounts
  if (command === "all") {
    let arr = [];
    for (const [id, data] of Object.entries(bank)) {
      const name = await Users.getNameUser(id);
      arr.push({ name, balance: data.balance });
    }

    arr.sort((a, b) => b.balance - a.balance);

    let msg = `📋 All Bank Accounts (Total: ${arr.length}) 📋\n`;
    arr.forEach((u, i) => {
      msg += `\n${i + 1}. ${u.name} - 💰 ${u.balance.toLocaleString()} coins`;
    });

    return api.sendMessage(msg, threadID);
  }

  // Default: show own balance
  const name = await Users.getNameUser(senderID);
  return api.sendMessage(formatBalance(name, bank[senderID].balance), threadID);
};
