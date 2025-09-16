// === modules/commands/bank.js ===
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "2.0.0",
  credits: "ChatGPT + Jaylord",
  hasPermssion: 0,
  description: "Bank system with UID checker (auto-update name on /bank)",
  usages: "/bank, /bank all, /bank add <uid> <amount>",
  commandCategory: "economy",
  cooldowns: 3,
};

// 🔑 Bot admins
const BOT_ADMINS = ["61559999326713"];

// Helper function to fetch username by UID
async function getUserName(uid, Users) {
  try {
    const name = await Users.getNameUser(uid);
    return name || uid; // Default to UID if no name found
  } catch {
    return uid; // Fallback if an error occurs
  }
}

// Format balance message
function formatBalance(user, balance) {
  return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

module.exports.run = async ({ api, event, args, Users }) => {
  const { threadID, senderID, messageID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // ✅ when the command is /bank all
  if (command === "all") {
    let allData = (await getData(`bank`)) || {};
    let results = [];

    for (let uid in allData) {
      // Fetch username first
      let name = await getUserName(uid, Users);

      // Auto-update name in DB if it differs
      if (allData[uid].name !== name) {
        allData[uid].name = name;
        await setData(`bank/${uid}`, allData[uid]); // Save updated name
      }

      results.push({
        uid,
        name,
        balance: allData[uid].balance || 0
      });
    }

    if (results.length === 0) {
      return api.sendMessage("🏦 No accounts found in the bank.", threadID, messageID);
    }

    // Sort by balance (descending order)
    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 Bank Accounts (Total: ${results.length}) 📋\n`;
    for (let i = 0; i < results.length; i++) {
      msg += `\n${i + 1}. 👤 ${results[i].name} — 💰 ${results[i].balance.toLocaleString()} coins`;
    }

    return api.sendMessage(msg, threadID, messageID);
  }

  // ✅ when the command is /bank add <uid> <amount>
  if (command === "add") {
    if (!BOT_ADMINS.includes(senderID)) {
      return api.sendMessage("❌ Only bot admins can add coins.", threadID, messageID);
    }

    const targetUID = args[1];
    const amount = parseInt(args[2]);

    if (!targetUID || isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID, messageID);
    }

    // Fetch username and current balance from DB
    let userData = (await getData(`bank/${targetUID}`)) || {
      uid: targetUID,
      name: await getUserName(targetUID, Users),
      balance: 0
    };

    // Update balance
    userData.balance += amount;

    // Update username if necessary
    let freshName = await getUserName(targetUID, Users);
    if (userData.name !== freshName) {
      userData.name = freshName;
    }

    await setData(`bank/${targetUID}`, userData);

    return api.sendMessage(
      `✅ Added 💰 ${amount.toLocaleString()} coins to ${userData.name}'s account.`,
      threadID,
      messageID
    );
  }

  // ✅ when the command is just /bank (check own balance)
  let userData = (await getData(`bank/${senderID}`)) || {
    uid: senderID,
    name: await getUserName(senderID, Users),
    balance: 0
  };

  // Fetch latest username if changed
  let freshName = await getUserName(senderID, Users);
  if (userData.name !== freshName) {
    userData.name = freshName;
    await setData(`bank/${senderID}`, userData); // Save updated name
  }

  return api.sendMessage(
    formatBalance(userData.name, userData.balance),
    threadID,
    messageID
  );
};
