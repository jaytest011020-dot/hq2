const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "3.4.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Bank system per group chat with toggle (only 2 allowed users can add coins or toggle)",
  usages: "/bank, /bank all, /bank add <uid> <amount>, /bank on/off",
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
function formatBalance(user, balance, hourlyBoost = 0) {
  let msg = `🏦 BANK ACCOUNT 🏦\n\n` +
            `👤 User: ${user}\n` +
            `💰 Balance: ${balance.toLocaleString()} coins`;
  if (hourlyBoost > 0) msg += `\n✨ Passive Bank Boost: +${hourlyBoost.toLocaleString()} coins/hr (from your pet)`;
  return msg;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;
  const allowedUIDs = ["61563731477181", "61559999326713"]; // Only these UIDs can control bank
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

      // Check for pet boost
      const userPet = (await getData(`pets/${threadID}/${uid}`)) || null;
      let petBoost = 0;
      if (userPet) petBoost = Math.floor(allData[uid].balance * (userPet.skills.bankBoost || 0));

      results.push({
        uid,
        name: freshName,
        balance: allData[uid].balance || 0,
        boost: petBoost
      });
    }

    if (!results.length) return api.sendMessage("🏦 No accounts found in this group.", threadID, messageID);

    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 BANK ACCOUNTS (Total: ${results.length}) 📋\n\n`;
    results.forEach((user, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      msg += `${medal} ${user.name} — 💰 ${user.balance.toLocaleString()} coins`;
      if (user.boost > 0) msg += ` (Boost: +${user.boost.toLocaleString()}/hr)`;
      msg += "\n";
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

  // 👤 Default: show own balance with passive boost
  const freshName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };

  // Apply pet boost per hour
  const pet = (await getData(`pets/${threadID}/${senderID}`)) || null;
  let hourlyBoost = 0;
  if (pet) {
    const now = Date.now();
    const hoursPassed = Math.floor((now - (userData.lastBankBoost || now)) / (1000 * 60 * 60));
    const boostPercent = pet.skills.bankBoost || 0;
    hourlyBoost = Math.floor(userData.balance * boostPercent);

    if (hoursPassed > 0 && hourlyBoost > 0) {
      const coinsToAdd = hourlyBoost * hoursPassed;
      userData.balance += coinsToAdd;
      userData.lastBankBoost = now;
    }
  }

  userData.name = freshName;
  await setData(`bank/${threadID}/${senderID}`, userData);

  return api.sendMessage(formatBalance(userData.name, userData.balance, hourlyBoost), threadID, messageID);
};
