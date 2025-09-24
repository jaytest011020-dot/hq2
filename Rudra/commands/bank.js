const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "3.3.2",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Bank system per group chat with toggle (only 2 allowed users can add coins or toggle)",
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
  return `🏦 BANK ACCOUNT 🏦\n\n` +
         `👤 User: ${user}\n` +
         `💰 Balance: ${balance.toLocaleString()} coins`;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  const allowedUIDs = ["61563731477181", "61559999326713"]; // ✅ Only these UIDs can control bank

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

  const command = args[0] ? args[0].toLowerCase() : "";

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

    const freshName = await getUserName(targetUID, api, Users);
    let userData = (await getData(`bank/${threadID}/${targetUID}`)) || { name: freshName, balance: 0 };

    userData.balance += amount;
    userData.name = freshName;
    await setData(`bank/${threadID}/${targetUID}`, userData);

    return api.sendMessage(
      `✅ Added 💰 ${amount.toLocaleString()} coins to ${userData.name}'s account.`,
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
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };
  userData.name = freshName;
  await setData(`bank/${threadID}/${senderID}`, userData);

  return api.sendMessage(formatBalance(userData.name, userData.balance), threadID, messageID);
};
