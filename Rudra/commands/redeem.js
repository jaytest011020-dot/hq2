const { setData, getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "redeem",
  version: "1.2.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Redeem code system with toggle per GC",
  usages: "/redeem <code> | /redeem make <code> <coins> <expiry> | /redeem on/off",
  commandCategory: "economy",
  cooldowns: 3,
};

function parseExpiry(text) {
  const match = text.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * ms[unit];
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // 🔹 Toggle system
  if ((command === "on" || command === "off") && args.length === 1) {
    let isAdmin = ADMINBOT.includes(senderID);

    if (!isAdmin && event.isGroup) {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        if (threadInfo.adminIDs.some(a => a.id == senderID)) isAdmin = true;
      } catch {}
    }

    if (!isAdmin)
      return api.sendMessage("❌ Only admins can toggle redeem system.", threadID, messageID);

    let redeemStatus = (await getData(`redeem/status/${threadID}`)) || { enabled: true };
    redeemStatus.enabled = command === "on";
    await setData(`redeem/status/${threadID}`, redeemStatus);

    return api.sendMessage(
      `🎟 Redeem system is now ${redeemStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
      threadID,
      messageID
    );
  }

  // 🔹 Check if redeem system is enabled
  const redeemStatus = (await getData(`redeem/status/${threadID}`)) || { enabled: true };
  if (!redeemStatus.enabled) {
    return api.sendMessage("❌ Redeem system is currently disabled in this group.", threadID, messageID);
  }

  // 🔹 Create code (bot admin only)
  if (command === "make" && args.length === 4) {
    if (!ADMINBOT.includes(senderID))
      return api.sendMessage("❌ Only bot admins can create redeem codes.", threadID, messageID);

    const code = args[1].toUpperCase(); // Always uppercase
    const coins = parseInt(args[2]);
    const expiryMs = parseExpiry(args[3]);

    if (!coins || coins <= 0 || !expiryMs)
      return api.sendMessage("❌ Usage: /redeem make <code> <coins> <expiry(1s/1m/1h/1d)>", threadID, messageID);

    let redeemData = (await getData("redeem/codes")) || {};
    redeemData[code] = {
      coins,
      created: Date.now(),
      expires: Date.now() + expiryMs,
      redeemed: [],
    };
    await setData("redeem/codes", redeemData);

    return api.sendMessage(
      `✅ Created redeem code: ${code}\n💰 Coins: ${coins}\n⏳ Expires in ${args[3]}`,
      threadID,
      messageID
    );
  }

  // 🔹 Redeem code
  if (!args[0]) {
    return api.sendMessage("❌ Please provide a redeem code.", threadID, messageID);
  }

  const code = args[0].toUpperCase(); // Always uppercase
  let redeemData = (await getData("redeem/codes")) || {};

  if (!redeemData || Object.keys(redeemData).length === 0) {
    return api.sendMessage("❌ No redeem codes available.", threadID, messageID);
  }

  const codeData = redeemData[code];
  if (!codeData) {
    return api.sendMessage("❌ Invalid or expired code.", threadID, messageID);
  }

  if (Date.now() > codeData.expires) {
    delete redeemData[code];
    await setData("redeem/codes", redeemData);
    return api.sendMessage("❌ This code has already expired.", threadID, messageID);
  }

  if (codeData.redeemed.includes(senderID)) {
    return api.sendMessage("❌ You already redeemed this code.", threadID, messageID);
  }

  // Add to redeemed list
  codeData.redeemed.push(senderID);
  redeemData[code] = codeData;
  await setData("redeem/codes", redeemData);

  // Add coins to bank
  let userData = await getData(`bank/global/${senderID}`);
  if (!userData) {
    const info = await api.getUserInfo(senderID);
    userData = {
      balance: 0,
      name: info[senderID]?.name || "Unknown User",
    };
  }
  userData.balance += codeData.coins;
  await setData(`bank/global/${senderID}`, userData);

  return api.sendMessage(
    `🎉 Successfully redeemed code!\n💰 You received ${codeData.coins} coins.\n🏦 New Balance: ${userData.balance}`,
    threadID,
    messageID
  );
};
