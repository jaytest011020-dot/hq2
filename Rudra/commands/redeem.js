const { setData, getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "redeem",
  version: "1.0.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Redeem code system with toggle and expiration",
  usages: "/redeem <code> | /redeem make <code> <coins> <expire> | /redeem on/off",
  commandCategory: "economy",
  cooldowns: 3,
};

// 🔑 Parse expiration string (1s, 1m, 1h, 1d)
function parseExpire(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const val = parseInt(match[1]);
  const unit = match[2];
  const now = Date.now();

  switch (unit) {
    case "s": return now + val * 1000;
    case "m": return now + val * 60 * 1000;
    case "h": return now + val * 60 * 60 * 1000;
    case "d": return now + val * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

// 🏦 Add coins to user balance
async function addCoins(uid, threadID, amount, api, Users) {
  const freshName = (await Users.getName(uid)) || `FB-User(${uid})`;
  let userData = (await getData(`bank/${threadID}/${uid}`)) || {
    name: freshName,
    balance: 0,
  };

  userData.balance += amount;
  userData.name = freshName;
  await setData(`bank/${threadID}/${uid}`, userData);

  return userData;
}

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // 🔹 Toggle system (must be EXACT: /redeem on or /redeem off)
  if ((command === "on" || command === "off") && args.length === 1) {
    let isAdmin = ADMINBOT.includes(senderID);

    if (!isAdmin && event.isGroup) {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        if (threadInfo.adminIDs.some((a) => a.id == senderID)) isAdmin = true;
      } catch {}
    }

    if (!isAdmin)
      return api.sendMessage(
        "❌ Only bot admins or GC admins can toggle the redeem system.",
        threadID
      );

    let redeemStatus =
      (await getData(`redeem/status/${threadID}`)) || { enabled: true };
    redeemStatus.enabled = command === "on";
    await setData(`redeem/status/${threadID}`, redeemStatus);

    return api.sendMessage(
      `🎟 Redeem system is now ${
        redeemStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"
      } in this group.`,
      threadID
    );
  }

  // 🔹 Check if redeem system is enabled in this GC
  const redeemStatus =
    (await getData(`redeem/status/${threadID}`)) || { enabled: true };
  if (!redeemStatus.enabled)
    return api.sendMessage(
      "❌ Redeem system is currently disabled by GC admin.",
      threadID
    );

  // 🔹 Create a code (bot admin only)
  if (command === "make") {
    if (!ADMINBOT.includes(senderID))
      return api.sendMessage("❌ Only bot admins can create redeem codes.", threadID);

    const code = args[1];
    const coins = parseInt(args[2]);
    const expire = parseExpire(args[3]);

    if (!code || isNaN(coins) || coins <= 0)
      return api.sendMessage(
        "❌ Usage: /redeem make <code> <coins> <expire>\nExample: /redeem make BONUS100 1000 1d",
        threadID
      );

    const redeemData = (await getData("redeem/codes")) || {};

    redeemData[code] = {
      coins,
      expire,
      usedBy: [],
    };

    await setData("redeem/codes", redeemData);

    return api.sendMessage(
      `✅ Created redeem code:\n🎟 Code: ${code}\n💰 Coins: ${coins.toLocaleString()}\n⏳ Expire: ${
        args[3] || "none"
      }`,
      threadID
    );
  }

  // 🔹 Redeem a code
  if (!args[0])
    return api.sendMessage(
      "❌ Please provide a redeem code.",
      threadID
    );

  const code = args[0];
  const redeemData = (await getData("redeem/codes")) || {};
  const codeData = redeemData[code];

  if (!codeData)
    return api.sendMessage("❌ Invalid or expired code.", threadID);

  if (codeData.expire && Date.now() > codeData.expire) {
    delete redeemData[code];
    await setData("redeem/codes", redeemData);
    return api.sendMessage("❌ This code has expired.", threadID);
  }

  if (codeData.usedBy.includes(senderID))
    return api.sendMessage("❌ You have already redeemed this code.", threadID);

  // ✅ Redeem success
  codeData.usedBy.push(senderID);
  await setData("redeem/codes", redeemData);

  const userData = await addCoins(
    senderID,
    threadID,
    codeData.coins,
    api,
    Users
  );

  return api.sendMessage(
    `🎉 Successfully redeemed code!\n\n👤 User: ${userData.name}\n💰 +${codeData.coins.toLocaleString()} coins\n🏦 New Balance: ${userData.balance.toLocaleString()} coins`,
    threadID
  );
};
