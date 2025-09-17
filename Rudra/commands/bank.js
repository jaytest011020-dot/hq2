// === modules/commands/bank.js ===
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "2.2.0",
  credits: "ChatGPT + Jaylord",
  hasPermssion: 0,
  description: "Bank system with UID checker (auto-update name on /bank)",
  usages: "/bank, /bank all, /bank add <uid> <amount>",
  commandCategory: "economy",
  cooldowns: 3,
};

// 🔑 Bot admins
const BOT_ADMINS = ["61559999326713"];

// Helper function to fetch username by UID (with fallback)
async function getUserName(uid, Users, api) {
  try {
    let name = await Users.getNameUser(uid);
    if (!name || name === uid) {
      // fallback to api.getUserInfo
      let info = await api.getUserInfo(uid);
      if (info && info[uid]?.name) {
        name = info[uid].name;
      } else {
        name = uid;
      }
    }
    return name;
  } catch (err) {
    console.log(`[BANK] Error fetching name for UID: ${uid}`, err);
    return uid;
  }
}

// Format balance message
function formatBalance(user, balance) {
  return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

module.exports.run = async ({ api, event, args, Users }) => {
  const { threadID, senderID, messageID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // ✅ /bank all
  if (command === "all") {
    let allData = (await getData(`bank`)) || {};
    let results = [];

    for (let uid in allData) {
      let name = await getUserName(uid, Users, api);

      if (allData[uid].name !== name) {
        allData[uid].name = name;
        await setData(`bank/${uid}`, allData[uid]);
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

    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 Bank Accounts (Total: ${results.length}) 📋\n`;
    for (let i = 0; i < results.length; i++) {
      msg += `\n${i + 1}. 👤 ${results[i].name} — 💰 ${results[i].balance.toLocaleString()} coins`;
    }

    return api.sendMessage(msg, threadID, messageID);
  }

  // ✅ /bank add <uid> <amount>
  if (command === "add") {
    if (!BOT_ADMINS.includes(senderID)) {
      return api.sendMessage("❌ Only bot admins can add coins.", threadID, messageID);
    }

    const targetUID = args[1];
    const amount = parseInt(args[2]);

    if (!targetUID || isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID, messageID);
    }

    let freshName = await getUserName(targetUID, Users, api);

    let userData = (await getData(`bank/${targetUID}`)) || {
      uid: targetUID,
      name: freshName,
      balance: 0
    };

    userData.balance += amount;

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

  // ✅ /bank (own balance)
  let freshName = await getUserName(senderID, Users, api);

  let userData = (await getData(`bank/${senderID}`)) || {
    uid: senderID,
    name: freshName,
    balance: 0
  };

  if (userData.name !== freshName) {
    console.log(`[BANK] Updating username for UID ${senderID}: ${userData.name} -> ${freshName}`);
    userData.name = freshName;
    await setData(`bank/${senderID}`, userData);
  }

  return api.sendMessage(
    formatBalance(userData.name, userData.balance),
    threadID,
    messageID
  );
};
