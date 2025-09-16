// === modules/commands/bank.js ===
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "3.3.0",
  hasPermssion: 0,
  credits: "ChatGPT + Jaylord",
  description: "Bank system with Firebase DB",
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
module.exports.handleEvent = async function ({ event, Users }) {
  const { senderID, body } = event;
  if (!senderID || !body) return;
  if (body.trim().startsWith("/")) return;

  // Load user data
  let userData = await getData(`/bank/${senderID}`);

  if (!userData) {
    let name;
    try {
      name = await Users.getNameUser(senderID);
    } catch {
      name = "Facebook User";
    }

    userData = { uid: senderID, name, balance: 0 };
  }

  userData.balance += 5; // Add coins per message
  await setData(`/bank/${senderID}`, userData);
};

// 🔹 Run command
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

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
    const accounts = (await getData("/bank")) || {};
    const arr = Object.values(accounts);

    arr.sort((a, b) => b.balance - a.balance);

    let msg = `📋 All Bank Accounts (Total: ${arr.length}) 📋\n`;
    arr.forEach((acc, i) => {
      msg += `\n${i + 1}. ${acc.name} - 💰 ${acc.balance.toLocaleString()} coins`;
    });

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

    let targetData = await getData(`/bank/${targetUID}`);
    if (!targetData) {
      let name;
      try {
        name = await Users.getNameUser(targetUID);
      } catch {
        name = "Facebook User";
      }
      targetData = { uid: targetUID, name, balance: 0 };
    }

    targetData.balance += amount;
    await setData(`/bank/${targetUID}`, targetData);

    return api.sendMessage(
      `✅ Added 💰 ${amount.toLocaleString()} coins to ${targetData.name}'s account.`,
      threadID
    );
  }

  // 📌 Default → show own balance
  let userData = await getData(`/bank/${senderID}`);

  if (!userData) {
    let name;
    try {
      name = await Users.getNameUser(senderID);
    } catch {
      name = "Facebook User";
    }
    userData = { uid: senderID, name, balance: 0 };
    await setData(`/bank/${senderID}`, userData);
  }

  return api.sendMessage(formatBalance(userData.name, userData.balance), threadID);
};
