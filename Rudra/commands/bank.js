const { setData, getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "bank",
  version: "2.8.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Bank system per GC with auto-updated usernames + send coins",
  usages: "/bank, /bank all, /bank add <uid> <amount>, /bank send @mention <coins>",
  commandCategory: "economy",
  cooldowns: 3,
};

// 🔑 Fetch username via api.getUserInfo
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid]?.name) return info[uid].name;
  } catch (err) {
    console.log(`[BANK] Error fetching name for UID: ${uid}`, err);
  }
  return `FB-User(${uid})`;
}

// 🏦 Format balance message
function formatBalance(user, balance) {
  return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID, messageID, mentions } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // 📋 Show all accounts in current group
  if (command === "all") {
    let allData = (await getData(`bank/${threadID}`)) || {};
    let results = [];

    for (let uid in allData) {
      let freshName = await getUserName(uid, api);
      if (allData[uid].name !== freshName) {
        allData[uid].name = freshName;
        await setData(`bank/${threadID}/${uid}`, allData[uid]);
      }

      results.push({
        uid,
        name: freshName,
        balance: allData[uid].balance || 0
      });
    }

    if (results.length === 0)
      return api.sendMessage("🏦 No accounts found in this group.", threadID, messageID);

    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 Bank Accounts in this group (Total: ${results.length}) 📋\n`;
    for (let i = 0; i < results.length; i++) {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      msg += `\n${medal} 👤 ${results[i].name} — 💰 ${results[i].balance.toLocaleString()} coins`;
    }

    return api.sendMessage(msg, threadID, messageID);
  }

  // ➕ Add coins (admin only, per group)
  if (command === "add") {
    if (!ADMINBOT.includes(senderID))
      return api.sendMessage("❌ Only bot admins can add coins.", threadID, messageID);

    const targetUID = args[1];
    const amount = parseInt(args[2]);
    if (!targetUID || isNaN(amount) || amount <= 0)
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID, messageID);

    const freshName = await getUserName(targetUID, api);
    let userData = (await getData(`bank/${threadID}/${targetUID}`)) || {
      uid: targetUID,
      name: freshName,
      balance: 0
    };

    userData.balance += amount;
    userData.name = freshName;
    await setData(`bank/${threadID}/${targetUID}`, userData);

    return api.sendMessage(
      `✅ Added 💰 ${amount.toLocaleString()} coins to ${userData.name}'s account.`,
      threadID,
      messageID
    );
  }

  // 💸 Send coins to mentioned user
  if (command === "send") {
    if (!mentions || Object.keys(mentions).length === 0)
      return api.sendMessage("❌ Please mention a user to send coins.", threadID, messageID);

    const amount = parseInt(args[2]);
    if (isNaN(amount) || amount <= 0)
      return api.sendMessage("❌ Please specify a valid number of coins to send.", threadID, messageID);

    const recipientID = Object.keys(mentions)[0];
    if (recipientID === senderID)
      return api.sendMessage("❌ You cannot send coins to yourself.", threadID, messageID);

    // Load sender data
    let senderData = (await getData(`bank/${threadID}/${senderID}`)) || {
      uid: senderID,
      name: await getUserName(senderID, api),
      balance: 0
    };
    if (senderData.balance < amount)
      return api.sendMessage("❌ You don't have enough coins to send.", threadID, messageID);

    // Load recipient data
    let recipientData = (await getData(`bank/${threadID}/${recipientID}`)) || {
      uid: recipientID,
      name: await getUserName(recipientID, api),
      balance: 0
    };

    // Update balances
    senderData.balance -= amount;
    recipientData.balance += amount;

    await setData(`bank/${threadID}/${senderID}`, senderData);
    await setData(`bank/${threadID}/${recipientID}`, recipientData);

    return api.sendMessage(
      `✅ Successfully sent 💰 ${amount.toLocaleString()} coins to ${recipientData.name}.\n` +
      `Your new balance: 💰 ${senderData.balance.toLocaleString()} coins`,
      threadID,
      messageID
    );
  }

  // 👤 Default: Check own balance in this group
  const freshName = await getUserName(senderID, api);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || {
    uid: senderID,
    name: freshName,
    balance: 0
  };

  userData.name = freshName;
  await setData(`bank/${threadID}/${senderID}`, userData);

  return api.sendMessage(
    formatBalance(userData.name, userData.balance),
    threadID,
    messageID
  );
};
