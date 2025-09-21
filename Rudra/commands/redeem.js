const { setData, getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "redeem",
  version: "2.0.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Redeem global codes for coins with per-GC toggle",
  usages: "/redeem <CODE> | /redeem make <CODE> <COINS> <EXPIRY(1s/1m/1h/1d)> | /redeem on/off",
  commandCategory: "economy",
  cooldowns: 3,
};

// 🕒 Expiry parser
function parseExpiry(text) {
  const match = text.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * ms[unit];
}

// 👤 Get username (same style as bank.js)
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

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // 🔹 Toggle system (on/off)
  if (command === "on" || command === "off") {
    let isAdmin = ADMINBOT.includes(senderID);

    if (!isAdmin && event.isGroup) {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        if (threadInfo.adminIDs.some(a => a.id == senderID)) isAdmin = true;
      } catch {}
    }

    if (!isAdmin) return api.sendMessage("❌ Only GC admins or bot admins can toggle redeem system.", threadID, messageID);

    let redeemStatus = (await getData(`redeem/status/${threadID}`)) || { enabled: true };
    redeemStatus.enabled = command === "on";
    await setData(`redeem/status/${threadID}`, redeemStatus);

    return api.sendMessage(
      `🎟 Redeem system is now ${redeemStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
      threadID,
      messageID
    );
  }

  // 🔹 Check if system enabled in GC
  const redeemStatus = (await getData(`redeem/status/${threadID}`)) || { enabled: true };
  if (!redeemStatus.enabled) return api.sendMessage("❌ Redeem system is disabled in this group.", threadID, messageID);

  // 🔹 Create new code (bot admin only)
  if (command === "make" && args.length === 4) {
    if (!ADMINBOT.includes(senderID))
      return api.sendMessage("❌ Only bot admins can create redeem codes.", threadID, messageID);

    const code = args[1].toUpperCase();
    const coins = parseInt(args[2]);
    const expiryMs = parseExpiry(args[3]);

    if (!coins || coins <= 0 || !expiryMs)
      return api.sendMessage("❌ Usage: /redeem make <CODE> <COINS> <EXPIRY(1s/1m/1h/1d)>", threadID, messageID);

    let codes = (await getData("redeem/codes")) || {};
    codes[code] = {
      coins,
      created: Date.now(),
      expires: Date.now() + expiryMs,
      redeemed: []
    };
    await setData("redeem/codes", codes);

    return api.sendMessage(
      `✅ Created redeem code!\n\n🔑 Code: ${code}\n💰 Coins: ${coins}\n⏳ Expires in ${args[3]}`,
      threadID,
      messageID
    );
  }

  // 🔹 Redeem existing code
  if (!args[0]) return api.sendMessage("❌ Please provide a redeem code.", threadID, messageID);

  const code = args[0].toUpperCase();
  let codes = (await getData("redeem/codes")) || {};
  const codeData = codes[code];

  if (!codeData) return api.sendMessage("❌ Invalid or expired code.", threadID, messageID);

  // Expired?
  if (Date.now() > codeData.expires) {
    delete codes[code];
    await setData("redeem/codes", codes);
    return api.sendMessage("❌ This code has already expired.", threadID, messageID);
  }

  // Already redeemed?
  if (codeData.redeemed.includes(senderID)) {
    return api.sendMessage("❌ You already redeemed this code.", threadID, messageID);
  }

  // Update bank balance (per GC)
  const freshName = await getUserName(senderID, api, Users);
  let bankData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };

  bankData.balance += codeData.coins;
  bankData.name = freshName;
  await setData(`bank/${threadID}/${senderID}`, bankData);

  // Mark as redeemed globally
  codeData.redeemed.push(senderID);
  codes[code] = codeData;
  await setData("redeem/codes", codes);

  return api.sendMessage(
    `🎉 Successfully redeemed!\n\n👤 ${bankData.name}\n💰 Received: ${codeData.coins.toLocaleString()} coins\n🏦 Balance in this GC: ${bankData.balance.toLocaleString()} coins`,
    threadID,
    messageID
  );
};
