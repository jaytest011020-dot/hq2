const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "4.1.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Bank system synced with Firebase user coins (only coins are updated, no auto-create)",
  usages: "/bank, /bank all, /bank add <uid> <amount>, /bank send @mention <coins>, /bank on/off",
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
  } catch (err) {}

  try {
    const name = await Users.getName(uid) || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch (err) {}

  const fallbackName = `FB-User(${uid})`;
  global.data.userName.set(uid, fallbackName);
  return fallbackName;
}

// 🏦 Format balance message
function formatBalance(user, balance) {
  return `🏦 BANK ACCOUNT 🏦\n\n👤 User: ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  const allowedUIDs = ["61563731477181", "61559999326713"]; // ✅ Only these UIDs can control bank
  const command = args[0] ? args[0].toLowerCase() : "";

  // --- Maintenance check ---
  try {
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) {
      const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg");
      return api.sendMessage(
        {
          body: "🚧 Bot is currently under maintenance. Bank commands are temporarily disabled.",
          attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : null,
        },
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error("Maintenance check failed:", err);
  }

  // 🔹 Toggle bank system (ONLY allowed UIDs)
  if (command === "on" || command === "off") {
    if (!allowedUIDs.includes(senderID)) {
      return api.sendMessage("❌ You are not allowed to toggle the bank system.", threadID, messageID);
    }

    let bankStatus = (await getData(`bank/status/${threadID}`)) || { enabled: true };
    bankStatus.enabled = command === "on";
    await setData(`bank/status/${threadID}`, bankStatus);

    return api.sendMessage(
      `🏦 Bank system is now ${bankStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
      threadID
    );
  }

  // 🔹 Check if bank system is enabled
  const bankStatus = (await getData(`bank/status/${threadID}`)) || { enabled: true };
  if (!bankStatus.enabled) return api.sendMessage("❌ Bank system is currently disabled.", threadID);

  // 📋 Show all accounts in the app (not per thread anymore)
  if (command === "all") {
    const allData = (await getData(`user`)) || {};
    const results = [];

    for (const uid in allData) {
      const freshName = await getUserName(uid, api, Users);
      const balance = parseInt(allData[uid].coins) || 0;
      results.push({ uid, name: freshName, balance });
    }

    if (!results.length) return api.sendMessage("🏦 No accounts found in the app.", threadID, messageID);

    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 BANK ACCOUNTS (Total: ${results.length}) 📋\n\n`;
    results.forEach((user, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      msg += `${medal} ${user.name} — 💰 ${user.balance.toLocaleString()} coins\n`;
    });

    return api.sendMessage(msg, threadID, messageID);
  }

  // ➕ Add coins (ONLY allowed UIDs)
  if (command === "add") {
    if (!allowedUIDs.includes(senderID)) {
      return api.sendMessage("❌ You are not allowed to add coins.", threadID, messageID);
    }

    const targetUID = args[1];
    const amount = parseInt(args[2]);
    if (!targetUID || isNaN(amount) || amount <= 0)
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID, messageID);

    const userData = await getData(`user/${targetUID}`);
    if (!userData) {
      return api.sendMessage("❌ Wala pang bank account ang user na ito sa app.", threadID, messageID);
    }

    const freshName = await getUserName(targetUID, api, Users);
    const currentBalance = parseInt(userData.coins) || 0;
    const newBalance = currentBalance + amount;

    await setData(`user/${targetUID}/coins`, newBalance);

    return api.sendMessage(
      `✅ Added 💰 ${amount.toLocaleString()} coins to ${freshName}'s account.`,
      threadID,
      messageID
    );
  }

  // 💸 Send coins (Everyone can use)
  if (command === "send") {
    const { mentions } = event;
    if (!mentions || !Object.keys(mentions).length)
      return api.sendMessage("❌ Please mention a user to send coins.", threadID, messageID);

    const recipientID = Object.keys(mentions)[0];
    if (recipientID === senderID)
      return api.sendMessage("❌ You cannot send coins to yourself.", threadID, messageID);

    let mentionName = Object.values(mentions)[0];
    const amountText = args.slice(1).join(" ").replace(mentionName, "").trim();
    const amount = parseInt(amountText);

    if (isNaN(amount) || amount <= 0)
      return api.sendMessage("❌ Please specify a valid number of coins.", threadID, messageID);

    const senderData = await getData(`user/${senderID}`);
    const recipientData = await getData(`user/${recipientID}`);

    if (!senderData) {
      return api.sendMessage("❌ Wala ka pang bank account sa app.", threadID, messageID);
    }
    if (!recipientData) {
      return api.sendMessage("❌ Wala pang bank account ang taong ito sa app.", threadID, messageID);
    }

    const senderBalance = parseInt(senderData.coins) || 0;
    const recipientBalance = parseInt(recipientData.coins) || 0;

    if (senderBalance < amount)
      return api.sendMessage("❌ You don't have enough coins.", threadID, messageID);

    await setData(`user/${senderID}/coins`, senderBalance - amount);
    await setData(`user/${recipientID}/coins`, recipientBalance + amount);

    return api.sendMessage(
      `✅ You sent 💰 ${amount.toLocaleString()} coins to ${await getUserName(recipientID, api, Users)}.\n` +
      `Your new balance: 💰 ${(senderBalance - amount).toLocaleString()} coins`,
      threadID,
      messageID
    );
  }

  // 👤 Default: show own balance
  const freshName = await getUserName(senderID, api, Users);
  const userData = await getData(`user/${senderID}`);

  if (!userData) {
    return api.sendMessage("❌ Wala ka pang bank account sa app.", threadID, messageID);
  }

  const balance = parseInt(userData.coins) || 0;
  return api.sendMessage(formatBalance(freshName, balance), threadID, messageID);
};
