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
  cooldowns: 3
};

// 🔑 Bot admins
const BOT_ADMINS = ["61559999326713"];

// helper para makuha name by UID
async function getUserName(uid, Users) {
  try {
    const name = await Users.getNameUser(uid);
    return name || uid;
  } catch {
    return uid;
  }
}

// format balance message
function formatBalance(user, balance) {
  return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

module.exports.run = async ({ api, event, args, Users }) => {
  const { threadID, senderID, messageID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // ✅ kapag /bank all
  if (command === "all") {
    let allData = (await getData(`bank`)) || {};
    let results = [];

    for (let uid in allData) {
      let name = await getUserName(uid, Users);

      // auto-update sa DB kung iba na name
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

    // sort by balance
    results.sort((a, b) => b.balance - a.balance);

    let msg = `📋 Bank Accounts (Total: ${results.length}) 📋\n`;
    for (let i = 0; i < results.length; i++) {
      msg += `\n${i + 1}. 👤 ${results[i].name} — 💰 ${results[i].balance.toLocaleString()} coins`;
    }

    return api.sendMessage(msg, threadID, messageID);
  }

  // ✅ kapag /bank add <uid> <amount>
  if (command === "add") {
    if (!BOT_ADMINS.includes(senderID)) {
      return api.sendMessage("❌ Only bot admins can add coins.", threadID, messageID);
    }

    const targetUID = args[1];
    const amount = parseInt(args[2]);

    if (!targetUID || isNaN(amount) || amount <= 0) {
      return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID, messageID);
    }

    let userData = (await getData(`bank/${targetUID}`)) || {
      uid: targetUID,
      name: await getUserName(targetUID, Users),
      balance: 0
    };

    userData.balance += amount;
    await setData(`bank/${targetUID}`, userData);

    return api.sendMessage(
      `✅ Added 💰 ${amount.toLocaleString()} coins to ${userData.name}'s account.`,
      threadID,
      messageID
    );
  }

  // ✅ kapag /bank (check own balance)
  let userData = (await getData(`bank/${senderID}`)) || {
    uid: senderID,
    name: await getUserName(senderID, Users),
    balance: 0
  };

  // refresh name kung nagbago
  let freshName = await getUserName(senderID, Users);
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
