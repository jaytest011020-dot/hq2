const { setData, getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "bank",
  version: "3.2.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Bank system per group chat with auto-updated usernames + send coins",
  usages: "/bank, /bank all, /bank add <uid> <amount>, /bank send @mention <coins>",
  commandCategory: "economy",
  cooldowns: 3,
};

// 🔑 Fetch username with global cache
async function getUserName(uid, api, Users) {
  let cachedName = global.data.userName.get(uid);
  if (cachedName) return cachedName;

  try {
    const userInfo = await api.getUserInfo(uid);
    const name = Object.values(userInfo)[0]?.name || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch (err) {
    console.log(`[BANK] api.getUserInfo failed for UID ${uid}:`, err);
  }

  try {
    const name = await Users.getName(uid) || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch (err) {
    console.log(`[BANK] Users.getName failed for UID ${uid}:`, err);
  }

  const fallbackName = `FB-User(${uid})`;
  global.data.userName.set(uid, fallbackName);
  return fallbackName;
}

// 🏦 Format balance message
function formatBalance(user, balance) {
  return `🏦 𝗕𝗮𝗻𝗸 𝗔𝗰𝗰𝗼𝘂𝗻𝘁 🏦\n\n` +
         `👤 𝗨𝘀𝗲𝗿: ${user}\n` +
         `💰 𝗕𝗮𝗹𝗮𝗻𝗰𝗲: ${balance.toLocaleString()} coins`;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID, mentions } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // 📋 Show all accounts in the current group
  if (command === "all") {
    const allData = (await getData(`bank/${threadID}`)) || {};
    const results = [];

    for (const uid in allData) {
      const freshName = await getUserName(uid, api, Users);

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

    if (!results.length) return api.sendMessage("🏦 No accounts found in this group.", threadID, messageID);

    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 𝗕𝗮𝗻𝗸 𝗔𝗰𝗰𝗼𝘂𝗻𝘁𝘀 (Total: ${results.length}) 📋\n\n`;
    results.forEach((user, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      msg += `${medal} ${user.name} — 💰 ${user.balance.toLocaleString()} coins\n`;
    });

    return api.sendMessage(msg, threadID, messageID);
  }

  // ➕ Add coins (bot admin or GC admin)
  if (command === "add") {
    let isAdmin = ADMINBOT.includes(senderID);

    if (!isAdmin && event.isGroup) {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        if (threadInfo.adminIDs.some(a => a.id == senderID)) isAdmin = true;
      } catch (err) {
        console.log("[BANK] Failed to check GC admin:", err);
      }
    }

    if (!isAdmin)
      return api.sendMessage("❌ Only bot admins or GC admins can add coins.", threadID, messageID);

    const targetUID = args[1];
    const amount = parseInt(args[2]);
    if (!targetUID || isNaN(amount) || amount <= 0)
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID, messageID);

    const freshName = await getUserName(targetUID, api, Users);
    let userData = (await getData(`bank/${threadID}/${targetUID}`)) || {
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

  // 💸 Send coins
  if (command === "send") {
    if (!mentions || !Object.keys(mentions).length)
      return api.sendMessage("❌ Please mention a user to send coins.", threadID, messageID);

    const amount = parseInt(args[2]);
    if (isNaN(amount) || amount <= 0)
      return api.sendMessage("❌ Please specify a valid number of coins.", threadID, messageID);

    const recipientID = Object.keys(mentions)[0];
    if (recipientID === senderID)
      return api.sendMessage("❌ You cannot send coins to yourself.", threadID, messageID);

    let senderData = (await getData(`bank/${threadID}/${senderID}`)) || {
      name: await getUserName(senderID, api, Users),
      balance: 0
    };

    if (senderData.balance < amount)
      return api.sendMessage("❌ You don't have enough coins.", threadID, messageID);

    let recipientData = (await getData(`bank/${threadID}/${recipientID}`)) || {
      name: await getUserName(recipientID, api, Users),
      balance: 0
    };

    senderData.balance -= amount;
    recipientData.balance += amount;

    await setData(`bank/${threadID}/${senderID}`, senderData);
    await setData(`bank/${threadID}/${recipientID}`, recipientData);

    return api.sendMessage(
      `✅ You sent 💰 ${amount.toLocaleString()} coins to ${recipientData.name}.\n` +
      `Your new balance: 💰 ${senderData.balance.toLocaleString()} coins`,
      threadID,
      messageID
    );
  }

  // 👤 Default: show own balance
  const freshName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || {
    name: freshName,
    balance: 0
  };

  userData.name = freshName;
  await setData(`bank/${threadID}/${senderID}`, userData);

  return api.sendMessage(formatBalance(userData.name, userData.balance), threadID, messageID);
};
