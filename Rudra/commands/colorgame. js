const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "cg",
  version: "1.1.0",
  credits: "ChatGPT + Jaylord La Peña",
  hasPermssion: 0,
  description: "Bet on colors! 3 random colors are drawn. Payout based on matches: 1×2, 2×3, 3×5. GC toggle available.",
  usages: "/cg <color> <bet> | /cg on | /cg off | /cg status",
  commandCategory: "games",
  cooldowns: 5,
};

// Available colors
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "brown"];

// Randomly select n items from array
function pickRandom(array, n) {
  const copy = [...array];
  const result = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

// Fetch username
async function getUserName(uid, api, Users) {
  let cachedName = global.data.userName.get(uid);
  if (cachedName) return cachedName;
  try {
    const info = await api.getUserInfo(uid);
    const name = Object.values(info)[0]?.name || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch {
    try {
      const name = await Users.getName(uid) || `FB-User(${uid})`;
      global.data.userName.set(uid, name);
      return name;
    } catch {
      const fallback = `FB-User(${uid})`;
      global.data.userName.set(uid, fallback);
      return fallback;
    }
  }
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID, isGroup } = event;
  const command = args[0]?.toLowerCase();

  // --- Maintenance check ---
  const maintenance = await getData("/maintenance") || { enabled: false };
  if (maintenance.enabled) {
    const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg");
    return api.sendMessage(
      {
        body: "🚧 Bot is under maintenance. Color game temporarily disabled.",
        attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : null,
      },
      threadID,
      messageID
    );
  }

  // --- Handle GC toggle ---
  if (["on", "off", "status"].includes(command)) {
    let isAdmin = ADMINBOT.includes(senderID);
    if (!isAdmin && isGroup) {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        if (threadInfo.adminIDs.some(a => a.id == senderID)) isAdmin = true;
      } catch {}
    }

    if (!isAdmin && command !== "status")
      return api.sendMessage("❌ Only GC admins or bot admins can toggle the color game.", threadID, messageID);

    if (command === "status") {
      const status = (await getData(`colorgame/status/${threadID}`)) || { enabled: true };
      return api.sendMessage(`🎨 Color game is ${status.enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`, threadID, messageID);
    }

    const enabled = command === "on";
    await setData(`colorgame/status/${threadID}`, { enabled });
    return api.sendMessage(`🎨 Color game is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`, threadID, messageID);
  }

  // --- Check if game is enabled ---
  const status = (await getData(`colorgame/status/${threadID}`)) || { enabled: true };
  if (!status.enabled) return api.sendMessage("❌ Color game is disabled in this group.", threadID, messageID);

  // --- Validate color & bet ---
  const colorInput = args[0]?.toLowerCase();
  const bet = parseInt(args[1]);

  if (!colorInput || !bet) {
    return api.sendMessage(`❌ Usage: /cg <color> <bet>\nAvailable colors: ${COLORS.join(", ")}`, threadID, messageID);
  }

  if (!COLORS.includes(colorInput)) {
    return api.sendMessage(`❌ Invalid color!\nAvailable colors: ${COLORS.join(", ")}`, threadID, messageID);
  }

  // --- Load user bank ---
  const freshName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };
  userData.name = freshName;

  if (bet <= 0 || bet > userData.balance) {
    return api.sendMessage(`❌ Invalid bet amount or insufficient balance.\nYour balance: ${userData.balance}`, threadID, messageID);
  }

  // --- Deduct bet ---
  userData.balance -= bet;

  // --- Draw 3 random colors ---
  const drawnColors = pickRandom(COLORS, 3);

  // --- Count matches ---
  const matchCount = drawnColors.filter(c => c === colorInput).length;

  let payout = 0;
  let resultText = "";

  switch (matchCount) {
    case 1:
      payout = bet * 2;
      resultText = `🎉 You matched 1 color! Payout ×2 → +${payout}`;
      break;
    case 2:
      payout = bet * 3;
      resultText = `🌟 You matched 2 colors! Payout ×3 → +${payout}`;
      break;
    case 3:
      payout = bet * 5;
      resultText = `🏆 JACKPOT! All 3 colors matched! Payout ×5 → +${payout}`;
      break;
    default:
      payout = 0;
      resultText = `😢 No matches. You lost ${bet} coins.`;
      break;
  }

  // --- Update balance ---
  userData.balance += payout;
  await setData(`bank/${threadID}/${senderID}`, userData);

  // --- Send result ---
  const msg = `🎨 Color Game Result 🎨\n\n👤 Player: ${freshName}\n🎲 Your Color: ${colorInput}\n🎯 Drawn Colors: ${drawnColors.join(", ")}\n\n💰 Bet: ${bet}\n${resultText}\n🏦 New Balance: ${userData.balance}`;
  return api.sendMessage(msg, threadID, messageID);
};
