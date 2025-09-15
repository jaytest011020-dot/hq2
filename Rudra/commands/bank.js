// === JSON-based Bank System (Safe Auto-Create) ===
const fs = require("fs");
const path = require("path");

// File kung saan i-save ang data
const bankFile = path.join(__dirname, "bank.json");

// Load data kung meron, kung wala auto-create {}
let bankData;
if (fs.existsSync(bankFile)) {
  try {
    const raw = fs.readFileSync(bankFile, "utf8");
    bankData = raw ? JSON.parse(raw) : {};
  } catch {
    bankData = {};
  }
} else {
  bankData = {};
  fs.writeFileSync(bankFile, JSON.stringify(bankData, null, 2));
}

// Save function (hindi tatawagin kung walang changes)
function saveBank() {
  fs.writeFileSync(bankFile, JSON.stringify(bankData, null, 2));
}

module.exports.config = {
  name: "bank",
  version: "3.2.0",
  hasPermssion: 0,
  credits: "ChatGPT + Jaylord",
  description: "Bank system with file persistence (JSON)",
  commandCategory: "Economy",
  usages: "/bank, /bank all, /bank add <uid> <amount>",
  cooldowns: 3,
};

// 🔑 Bot admins
const BOT_ADMINS = ["61559999326713"];

// Format balance
function formatBalance(user, balance) {
  return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

// 🔹 Auto add coins per normal message
module.exports.handleEvent = async function ({ event }) {
  const { senderID, body } = event;
  if (!senderID || !body) return;

  if (body.trim().startsWith("/")) return;

  if (!bankData[senderID]) bankData[senderID] = 0;
  bankData[senderID] += 5;
  saveBank();
};

// 🔹 Run command
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  const command = args[0]?.toLowerCase();

  const validArgs = ["", "all", "add"];
  if (!validArgs.includes(command)) {
    return api.sendMessage(
      "❌ Invalid usage.\n\n" +
      "📌 Correct Usage:\n" +
      "• /bank → check your balance\n" +
      "• /bank all → show all balances\n" +
      "• /bank add <uid> <amount> → add coins (admin only)",
      threadID
    );
  }

  // 📋 Show all accounts
  if (command === "all") {
    const accounts = Object.entries(bankData).map(([uid, balance]) => ({ uid, balance }));

    accounts.sort((a, b) => b.balance - a.balance);

    let msg = `📋 All Bank Accounts (Total: ${accounts.length}) 📋\n`;
    for (let i = 0; i < accounts.length; i++) {
      let name;
      try {
        name = await Users.getNameUser(accounts[i].uid);
      } catch {
        name = accounts[i].uid;
      }
      msg += `\n${i + 1}. ${name} - 💰 ${accounts[i].balance.toLocaleString()} coins`;
    }

    return api.sendMessage(msg, threadID);
  }

  // 🔑 Admin add coins
  if (command === "add") {
    if (!BOT_ADMINS.includes(senderID)) {
      return api.sendMessage("❌ Only bot admins can add coins.", threadID);
    }

    const targetUID = args[1];
    const amount = parseInt(args[2]);

    if (!targetUID || isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID);
    }

    if (!bankData[targetUID]) bankData[targetUID] = 0;
    bankData[targetUID] += amount;
    saveBank();

    let name;
    try {
      name = await Users.getNameUser(targetUID);
    } catch {
      name = targetUID;
    }

    return api.sendMessage(
      `✅ Added 💰 ${amount.toLocaleString()} coins to ${name}'s account.`,
      threadID
    );
  }

  // 📌 Default → show own balance
  if (!bankData[senderID]) bankData[senderID] = 0;
  saveBank();

  let name;
  try {
    name = await Users.getNameUser(senderID);
  } catch {
    name = senderID;
  }

  return api.sendMessage(formatBalance(name, bankData[senderID]), threadID);
};
