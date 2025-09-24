const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "4.1.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Bank system synced with Firebase user coins",
  usages: "/bank, /bank all, /bank top [limit], /bank add <uid> <amount>, /bank send @mention <coins>",
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

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  const allowedUIDs = ["61563731477181", "61559999326713"]; // ✅ Only these UIDs can add coins

  const command = args[0] ? args[0].toLowerCase() : "";

  // 📋 Show all accounts
  if (command === "all") {
    const allUsers = (await getData("user")) || {};
    const results = [];

    for (const uid in allUsers) {
      const balance = allUsers[uid].coins || 0;
      const freshName = await getUserName(uid, api, Users);
      results.push({ uid, name: freshName, balance });
    }

    if (!results.length) return api.sendMessage("🏦 Walang accounts sa database.", threadID, messageID);

    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 BANK ACCOUNTS (Total: ${results.length}) 📋\n\n`;
    results.forEach((user, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      msg += `${medal} ${user.name} — 💰 ${user.balance.toLocaleString()} coins\n`;
    });

    return api.sendMessage(msg, threadID, messageID);
  }

  // 🏆 Top richest users
  if (command === "top") {
    const limit = parseInt(args[1]) || 10; // default 10
    const allUsers = (await getData("user")) || {};
    const results = [];

    for (const uid in allUsers) {
      const balance = allUsers[uid].coins || 0;
      const freshName = await getUserName(uid, api, Users);
      results.push({ uid, name: freshName, balance });
    }

    if (!results.length) return api.sendMessage("🏦 Walang accounts sa database.", threadID, messageID);

    results.sort((a, b) => b.balance - a.balance);

    let msg = `🏆 TOP ${limit} RICHEST USERS 🏆\n\n`;
    results.slice(0, limit).forEach((user, i) => {
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
    if (!targetUID || isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID, messageID);
    }

    let targetData = await getData(`user/${targetUID}`);
    if (!targetData) {
      return api.sendMessage("❌ Walang bank account yung user na ito sa app.", threadID, messageID);
    }

    const newBalance = (targetData.coins || 0) + amount;
    await setData(`user/${targetUID}/coins`, newBalance);

    return api.sendMessage(
      `✅ Nadagdagan ng 💰 ${amount.toLocaleString()} coins si ${await getUserName(targetUID, api, Users)}.\n` +
      `Bagong balance: 💰 ${newBalance.toLocaleString()} coins`,
      threadID,
      messageID
    );
  }

  // 💸 Send coins
  if (command === "send") {
    const { mentions } = event;
    if (!mentions || !Object.keys(mentions).length) {
      return api.sendMessage("❌ Please mention a user to send coins.", threadID, messageID);
    }

    const recipientID = Object.keys(mentions)[0];
    if (recipientID === senderID) {
      return api.sendMessage("❌ You cannot send coins to yourself.", threadID, messageID);
    }

    let mentionName = Object.values(mentions)[0];
    const amountText = args.slice(1).join(" ").replace(mentionName, "").trim();
    const amount = parseInt(amountText);

    if (isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Please specify a valid number of coins.", threadID, messageID);
    }

    let senderData = await getData(`user/${senderID}`);
    if (!senderData) {
      return api.sendMessage("❌ Wala ka pang bank account sa app.", threadID, messageID);
    }

    if ((senderData.coins || 0) < amount) {
      return api.sendMessage("❌ Wala kang sapat na coins.", threadID, messageID);
    }

    let recipientData = await getData(`user/${recipientID}`);
    if (!recipientData) {
      return api.sendMessage("❌ Wala pang bank account yung nirecipient sa app.", threadID, messageID);
    }

    const senderNewBalance = (senderData.coins || 0) - amount;
    const recipientNewBalance = (recipientData.coins || 0) + amount;

    await setData(`user/${senderID}/coins`, senderNewBalance);
    await setData(`user/${recipientID}/coins`, recipientNewBalance);

    return api.sendMessage(
      `✅ Nagpadala ka ng 💰 ${amount.toLocaleString()} coins kay ${await getUserName(recipientID, api, Users)}.\n` +
      `Bagong balance mo: 💰 ${senderNewBalance.toLocaleString()} coins`,
      threadID,
      messageID
    );
  }

  // 👤 Default: show own balance
  const freshName = await getUserName(senderID, api, Users);
  let userData = await getData(`user/${senderID}`);
  if (!userData) {
    return api.sendMessage("❌ Wala ka pang bank account sa app.", threadID, messageID);
  }

  return api.sendMessage(formatBalance(freshName, userData.coins || 0), threadID, messageID);
};
