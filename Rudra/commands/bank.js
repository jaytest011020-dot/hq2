const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "4.0.0",
  hasPermssion: 0,
  credits: "ChatGPT + Jaylord",
  description: "Bank system with Firebase persistence",
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

  let cash = (await getData(`bank/${senderID}`)) || 0;
  cash += 5;
  await setData(`bank/${senderID}`, cash);
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
    const data = (await getData("bank")) || {};
    const accounts = Object.entries(data).map(([uid, balance]) => ({
      uid,
      balance,
    }));

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

    let cash = (await getData(`bank/${targetUID}`)) || 0;
    cash += amount;
    await setData(`bank/${targetUID}`, cash);

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
  let balance = (await getData(`bank/${senderID}`)) || 0;
  await setData(`bank/${senderID}`, balance);

  let name;
  try {
    name = await Users.getNameUser(senderID);
  } catch {
    name = senderID;
  }

  return api.sendMessage(formatBalance(name, balance), threadID);
};
