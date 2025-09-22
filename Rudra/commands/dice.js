const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "dice",
  version: "1.9.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Roll a dice and win coins with multipliers, per-GC toggle, respects maintenance mode",
  usages: "/dice <bet> | /dice on | /dice off",
  commandCategory: "games",
  cooldowns: 5
};

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

function diceEmoji(number) {
  const emojis = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
  return emojis[number - 1] || "🎲";
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function formatDiceMessage(userName, diceNumber, bet, multiplier, balance) {
  let msg = "🎲✨ Dice Game Result ✨🎲\n\n";
  msg += "👤 Player: " + userName + "\n";
  msg += "🎲 Dice Roll: " + diceEmoji(diceNumber) + " (" + diceNumber + ")\n\n";

  msg += "💰 Bet: " + bet.toLocaleString() + " coins\n";
  if (multiplier > 0) {
    msg += `🎯 Result: You won ×${multiplier}!\n`;
    msg += "🏦 New Balance: " + balance.toLocaleString() + " coins\n";
  } else {
    msg += "🎯 Result: You lost.\n";
    msg += "🏦 New Balance: " + balance.toLocaleString() + " coins\n";
  }

  if (diceNumber === 6) msg += "\n🔥 Lucky roll! Maximum dice!";
  else if (diceNumber >= 1 && diceNumber <= 3) msg += "\n❄️ Unlucky roll! Dice too low.";
  else msg += "\n🙂 Nice roll!";

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
          body: "🚧 Bot is under maintenance. Dice temporarily disabled.",
          attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : undefined
        },
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error(err);
  }

  // 🔹 Handle per-GC toggle
  const command = args[0] ? args[0].toLowerCase() : "";
  if (command === "on" || command === "off") {
    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);
      if (!isAdmin) return api.sendMessage("❌ Only GC admins can toggle the dice game.", threadID, messageID);

      const enabled = command === "on";
      await setData(`dice/status/${threadID}`, { enabled });

      return api.sendMessage(`🎲 Dice game is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`, threadID, messageID);
    } catch (err) {
      console.error(err);
      return api.sendMessage("⚠️ Failed to toggle dice game.", threadID, messageID);
    }
  }

  // 🔹 Check if dice is enabled in this GC
  const diceStatus = (await getData(`dice/status/${threadID}`)) || { enabled: true };
  if (!diceStatus.enabled) return api.sendMessage("❌ Dice game is currently disabled in this group.", threadID, messageID);

  // 🔹 Roll dice
  const freshName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };
  userData.name = freshName;

  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) return api.sendMessage("❌ Please specify a valid bet amount.", threadID, messageID);
  if (bet > userData.balance) return api.sendMessage("❌ Not enough coins to bet.", threadID, messageID);

  const diceNumber = rollDice();
  let multiplier = 0;

  if (diceNumber >= 4 && diceNumber <= 5) multiplier = 2;
  else if (diceNumber === 6) multiplier = 3;

  if (multiplier > 0) userData.balance += bet * multiplier;
  else userData.balance -= bet;

  await setData(`bank/${threadID}/${senderID}`, userData);

  const msg = formatDiceMessage(freshName, diceNumber, bet, multiplier, userData.balance);
  return api.sendMessage(msg, threadID, messageID);
};
