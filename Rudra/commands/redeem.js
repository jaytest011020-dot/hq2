// redeem.js (debug-friendly, fixed)
const { setData, getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "redeem",
  version: "2.1.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "Redeem global codes for coins with per-GC toggle (debug-ready)",
  usages: "/redeem <CODE> | /redeem make <CODE> <COINS> <EXPIRY(1s/1m/1h/1d)> | /redeem on/off",
  commandCategory: "economy",
  cooldowns: 3,
};

function parseExpiry(text) {
  if (!text) return null;
  const match = text.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return (ms[unit] || null) * num;
}

async function getUserNameSafe(uid, api, Users) {
  try {
    const cached = global.data && global.data.userName && global.data.userName.get(uid);
    if (cached) return cached;
  } catch (e) {}
  try {
    const info = await api.getUserInfo(uid);
    const name = Object.values(info)[0]?.name || `FB-User(${uid})`;
    try { global.data.userName.set(uid, name); } catch (e) {}
    return name;
  } catch (err) {
    try {
      const name2 = await Users.getName(uid);
      try { global.data.userName.set(uid, name2); } catch (e) {}
      return name2 || `FB-User(${uid})`;
    } catch (e2) {
      return `FB-User(${uid})`;
    }
  }
}

module.exports.run = async function ({ api, event, args, Users }) {
  try {
    const { threadID, senderID, messageID } = event;
    const rawArgs = args || [];
    const command = rawArgs[0] ? rawArgs[0].toLowerCase() : "";

    console.log(`[REDEEM] Called by ${senderID} in thread ${threadID} with args=${JSON.stringify(rawArgs)}`);

    // ---- Toggle (exactly one arg: on/off) ----
    if ((command === "on" || command === "off") && rawArgs.length === 1) {
      let isAdmin = Array.isArray(ADMINBOT) && ADMINBOT.includes(senderID);

      if (!isAdmin && event.isGroup) {
        try {
          const threadInfo = await api.getThreadInfo(threadID);
          if (threadInfo && threadInfo.adminIDs && threadInfo.adminIDs.some(a => a.id == senderID)) isAdmin = true;
        } catch (e) {
          console.error("[REDEEM] getThreadInfo error:", e);
        }
      }

      if (!isAdmin) {
        console.log("[REDEEM] toggle denied - not admin");
        return api.sendMessage("❌ Only GC admins or bot admins can toggle redeem system.", threadID, messageID);
      }

      let redeemStatus = (await getData(`redeem/status/${threadID}`)) || { enabled: true };
      redeemStatus.enabled = command === "on";
      await setData(`redeem/status/${threadID}`, redeemStatus);

      console.log(`[REDEEM] toggle set to ${redeemStatus.enabled} for thread ${threadID}`);
      return api.sendMessage(
        `🎟 Redeem system is now ${redeemStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
        threadID,
        messageID
      );
    }

    // ---- Check GC enabled ----
    const redeemStatus = (await getData(`redeem/status/${threadID}`)) || { enabled: true };
    if (!redeemStatus.enabled) {
      console.log("[REDEEM] redeem disabled in this GC");
      return api.sendMessage("❌ Redeem system is disabled in this group.", threadID, messageID);
    }

    // ---- Create code (bot admin only) ----
    if (command === "make") {
      if (!Array.isArray(rawArgs) || rawArgs.length < 4) {
        return api.sendMessage("❌ Usage: /redeem make <CODE> <COINS> <EXPIRY(1s/1m/1h/1d)>", threadID, messageID);
      }

      if (!Array.isArray(ADMINBOT) || !ADMINBOT.includes(senderID)) {
        console.log("[REDEEM] create denied - not bot admin");
        return api.sendMessage("❌ Only bot admins can create redeem codes.", threadID, messageID);
      }

      const code = rawArgs[1].toUpperCase();
      const coins = parseInt(rawArgs[2], 10);
      const expiryMs = parseExpiry(rawArgs[3]);

      if (!code || isNaN(coins) || coins <= 0 || !expiryMs) {
        return api.sendMessage("❌ Usage: /redeem make <CODE> <COINS> <EXPIRY(1s/1m/1h/1d)>", threadID, messageID);
      }

      let codes = (await getData("redeem/codes")) || {};
      codes[code] = {
        coins,
        created: Date.now(),
        expires: Date.now() + expiryMs,
        redeemed: []
      };
      await setData("redeem/codes", codes);

      console.log(`[REDEEM] Created code ${code} coins=${coins} expiresIn=${rawArgs[3]}`);
      return api.sendMessage(
        `✅ Created redeem code!\n\n🔑 Code: ${code}\n💰 Coins: ${coins}\n⏳ Expires in ${rawArgs[3]}`,
        threadID,
        messageID
      );
    }

    // ---- Redeem code ----
    if (!rawArgs[0]) {
      return api.sendMessage("❌ Please provide a redeem code.", threadID, messageID);
    }

    const code = rawArgs[0].toUpperCase();
    let codes = (await getData("redeem/codes")) || {};

    console.log("[REDEEM] codes keys:", Object.keys(codes || {}));
    if (!codes || Object.keys(codes).length === 0) {
      console.log("[REDEEM] No codes in DB");
      return api.sendMessage("❌ No redeem codes available.", threadID, messageID);
    }

    const codeData = codes[code];
    if (!codeData) {
      console.log(`[REDEEM] code not found: ${code}`);
      return api.sendMessage("❌ Invalid or expired code.", threadID, messageID);
    }

    // expired?
    if (codeData.expires && Date.now() > codeData.expires) {
      console.log(`[REDEEM] code expired: ${code}`);
      // remove expired code for cleanliness
      delete codes[code];
      await setData("redeem/codes", codes);
      return api.sendMessage("❌ This code has already expired.", threadID, messageID);
    }

    // already redeemed by this user?
    if (Array.isArray(codeData.redeemed) && codeData.redeemed.includes(senderID)) {
      console.log(`[REDEEM] already redeemed by ${senderID}: ${code}`);
      return api.sendMessage("❌ You already redeemed this code.", threadID, messageID);
    }

    // Mark redeemed (push user)
    codeData.redeemed = Array.isArray(codeData.redeemed) ? codeData.redeemed : [];
    codeData.redeemed.push(senderID);
    codes[code] = codeData;
    await setData("redeem/codes", codes);

    // Update bank per GC
    const userName = await getUserNameSafe(senderID, api, Users);
    let bankData = (await getData(`bank/${threadID}/${senderID}`)) || { name: userName, balance: 0 };
    bankData.name = userName;
    bankData.balance = (bankData.balance || 0) + (codeData.coins || 0);
    await setData(`bank/${threadID}/${senderID}`, bankData);

    console.log(`[REDEEM] success: ${senderID} got ${codeData.coins} coins in thread ${threadID}`);
    return api.sendMessage(
      `🎉 Successfully redeemed!\n\n👤 ${bankData.name}\n💰 Received: ${Number(codeData.coins).toLocaleString()} coins\n🏦 Balance in this GC: ${Number(bankData.balance).toLocaleString()} coins`,
      threadID,
      messageID
    );
  } catch (err) {
    console.error("[REDEEM] Unexpected error:", err);
    // try to notify user so bot isn't silent
    try {
      await api.sendMessage("⚠️ An error occurred while processing redeem. Check bot logs.", event.threadID, event.messageID);
    } catch (e) {
      console.error("[REDEEM] Failed to send error message:", e);
    }
  }
};
