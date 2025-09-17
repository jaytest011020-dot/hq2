const { setData, getData } = require("../../database.js"); // Firebase methods
const BOT_ADMINS = ["61559999326713"]; // Bot admins

// Helper function to fetch username by UID (with fallback)
async function getUserName(uid, Users, api) {
  try {
    // First attempt: Get the username via Users.getNameUser
    let name = await Users.getNameUser(uid);

    // If name is not available or is the default, try fetching via API
    if (!name || name === uid || name === "Facebook users") {
      console.log(`[BANK] Fallback: Attempting to fetch name from api.getUserInfo for UID: ${uid}`);
      let info = await api.getUserInfo(uid);
      name = info[uid]?.name || uid;  // Fallback to UID if no name is found
    }

    return name;
  } catch (err) {
    console.error(`[BANK] Error fetching name for UID: ${uid}`, err);
    return uid; // Return UID if fetching fails
  }
}

// Format balance message
function formatBalance(user, balance) {
  return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

// /bank command handling
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

// /bank command
module.exports.run = async ({ api, event, args, Users }) => {
  const { threadID, senderID, messageID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // ✅ /bank all
  if (command === "all") {
    let allData = (await getData(`bank`)) || {};
    let results = [];

    for (let uid in allData) {
      let name = await getUserName(uid, Users, api); // Fetch username

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

    // Sort results by balance (descending)
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

    // Fetch the user's name and update the balance
    let freshName = await getUserName(targetUID, Users, api);

    let userData = (await getData(`bank/${targetUID}`)) || {
      uid: targetUID,
      name: freshName,
      balance: 0
    };

    userData.balance += amount;

    // Update the name if it has changed
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

  // ✅ /bank (check own balance)
  let freshName = await getUserName(senderID, Users, api);

  let userData = (await getData(`bank/${senderID}`)) || {
    uid: senderID,
    name: freshName,
    balance: 0
  };

  // Update name if it has changed
  if (userData.name !== freshName) {
    console.log(`[BANK] Updating username for UID ${senderID}: ${userData.name} -> ${freshName}`);
    userData.name = freshName;
    await setData(`bank/${senderID}`, userData); // Save updated name
  }

  return api.sendMessage(
    formatBalance(userData.name, userData.balance),
    threadID,
    messageID
  );
};

// 🔹 Auto add coins per normal message
module.exports.handleEvent = async function ({ event }) {
  const { senderID, body } = event;
  if (!senderID || !body) return;

  // Don't give coins if the message is a command
  if (body.trim().startsWith("/")) return;

  // Auto-create bank data for the user if not exists
  const bankData = (await getData(`bank/${senderID}`)) || { balance: 0 };
  bankData.balance += 5; // Add coins for normal messages
  await setData(`bank/${senderID}`, bankData); // Save updated balance

  console.log(`[BANK] Added 5 coins to ${senderID}'s account.`);
};
