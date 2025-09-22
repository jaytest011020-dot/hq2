const { getData, setData } = require("../../database.js");
const { ADMINBOT } = global.config;
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "dice",
  version: "2.2.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Roll a dice and bet coins (1–4 lose, 5×2, 6×3) with per-GC toggle & maintenance check",
  usages: "/dice <bet> | /dice on | /dice off | /dice status",
  commandCategory: "games",
  cooldowns: 5
};

// 🔑 Get username with caching
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

// 🎲 Dice emoji
function diceEmoji(number) {
  const emojis = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"]; // ⚀⚁⚂⚃⚄⚅
  return emojis[number - 1] || "🎲";
}

// 🎲 Roll dice
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// 🎲 Format result
function formatDiceMessage(userName, diceNumber, bet, resultText, balance) {
  let msg = "🎲✨ Dice Game Result ✨🎲\n\n";
  msg += `👤 Player: ${userName}\n`;
  msg += `🎲 Dice Roll: ${diceEmoji(diceNumber)} (${diceNumber})\n\n`;
  msg += `💰 Bet: ${bet.toLocaleString()} coins\n`;
  msg += `➡️ Result: ${resultText}\n`;
  msg += `🏦 New Balance: ${balance.toLocaleString()} coins\n`;

  if (diceNumber === 6) msg += "\n🔥 Lucky roll! Maximum dice!";
  else if (diceNumber === 1) msg += "\n❄️ Unlucky roll! Minimum dice!";
  else msg += "\n🙂 Better luck next time!";

  return msg;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  // 🔹 Maintenance check
  try {
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) {
      const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg");
      return api.sendMessage(
        {
          body: "🚧 Bot is under maintenance. Dice game is disabled.",
          attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : undefined,
        },
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error("Maintenance check failed:", err);
  }

  const firstArg = args[0];
  const command = firstArg?.toLowerCase();
  const bet = parseInt(firstArg);

  // 🔹 Handle GC toggle
  if (["on", "off", "status"].includes(command)) {
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);

    if (!isAdmin && command !== "status")
      return api.sendMessage("❌ Only GC admins can toggle dice.", threadID, messageID);

    if (command === "status") {
      const diceStatus = (await getData(`dice/status/${threadID}`)) || { enabled: true };
      return api.sendMessage(`🎲 Dice game is ${diceStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`, threadID, messageID);
    }

    const enabled = command === "on";
    await setData(`dice/status/${threadID}`, { enabled });
    return api.sendMessage(`🎲 Dice game is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`, threadID, messageID);
  }

  // 🔹 Check if dice is enabled in GC
  const diceStatus = (await getData(`dice/status/${threadID}`)) || { enabled: true };
  if (!diceStatus.enabled)
    return api.sendMessage("❌ Dice game is disabled in this group.", threadID, messageID);

  // 🔹 Bank status
  const bankStatus = (await getData(`bank/status/${threadID}`)) || { enabled: true };
  if (!bankStatus.enabled) return api.sendMessage("❌ Bank system is disabled in this group.", threadID, messageID);

  // 🔹 Load user data
  const freshName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };
  userData.name = freshName;

  // 🔹 Validate bet
  if (isNaN(bet) || bet <= 0)
    return api.sendMessage("❌ Specify a valid bet. Usage: /dice <bet amount>", threadID, messageID);
  if (userData.balance < bet)
    return api.sendMessage(`❌ You don't have enough coins! Your balance: ${userData.balance}`, threadID, messageID);

  // 🎲 Roll dice & apply rules
  const diceNumber = rollDice();
  let resultText = "";

  if (diceNumber >= 1 && diceNumber <= 4) {
    userData.balance -= bet;
    resultText = `😢 You lost ${bet.toLocaleString()} coins.`;
  } else if (diceNumber === 5) {
    userData.balance += bet; // net gain = +bet (×2 total)
    resultText = `🌟 You won ×2! (+${bet.toLocaleString()} coins)`;
  } else if (diceNumber === 6) {
    userData.balance += bet * 2; // net gain = +2× bet (×3 total)
    resultText = `🔥 JACKPOT! You won ×3! (+${(bet * 2).toLocaleString()} coins)`;
  }

  await setData(`bank/${threadID}/${senderID}`, userData);

  const msg = formatDiceMessage(freshName, diceNumber, bet, resultText, userData.balance);
  return api.sendMessage(msg, threadID, messageID);
};
