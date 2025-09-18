const { setData, getData } = require("../../database.js");

// ✅ Load admin list via global.config
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "bank",
  version: "2.4.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Bank system with auto-updated usernames",
  usages: "/bank, /bank all, /bank add <uid> <amount>",
  commandCategory: "economy",
  cooldowns: 3,
};

// 🔑 Always fetch fresh username via api.getUserInfo
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid]?.name) {
      return info[uid].name;
    }
    return `FB-User(${uid})`;
  } catch (err) {
    console.log(`[BANK] Error fetching name for UID: ${uid}`, err);
    return `FB-User(${uid})`;
  }
}

// 🏦 Format balance message
function formatBalance(user, balance) {
  return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID, messageID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // 📋 Show all accounts
  if (command === "all") {
    let allData = (await getData(`bank`)) || {};
    let results = [];

    for (let uid in allData) {
      // ✅ Always fetch fresh username
      let freshName = await getUserName(uid, api);

      // update name in DB if changed
      if (allData[uid].name !== freshName) {
        allData[uid].name = freshName;
        await setData(`bank/${uid}`, allData[uid]);
      }

      results.push({
        uid,
        name: freshName,
        balance: allData[uid].balance || 0
      });
    }

    if (results.length === 0) {
      return api.sendMessage("🏦 No accounts found in the bank.", threadID, messageID);
    }

    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 Bank Accounts (Total: ${results.length}) 📋\n`;
    for (let i = 0; i < results.length; i++) {
      msg += `\n${i + 1}. 👤 ${results[i].name} — 💰 ${results[i].balance.toLocaleString()} coins`;
    }

    return api.sendMessage(msg, threadID, messageID);
  }

  // ➕ Add coins (admin only)
  if (command === "add") {
    if (!ADMINBOT.includes(senderID)) {
      return api.sendMessage("❌ Only bot admins can add coins.", threadID, messageID);
    }

    const targetUID = args[1];
    const amount = parseInt(args[2]);

    if (!targetUID || isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID, messageID);
    }

    const freshName = await getUserName(targetUID, api);

    let userData = (await getData(`bank/${targetUID}`)) || {
      uid: targetUID,
      name: freshName,
      balance: 0
    };

    userData.balance += amount;

    // auto-update name if changed
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

  // 👤 Default: Check own balance
  const freshName = await getUserName(senderID, api);

  let userData = (await getData(`bank/${senderID}`)) || {
    uid: senderID,
    name: freshName,
    balance: 0
  };

  if (userData.name !== freshName) {
    userData.name = freshName;
    await setData(`bank/${senderID}`, userData);
  }

  return api.sendMessage(
    formatBalance(userData.name, userData.balance),
    threadID,
    messageID
  );
};
