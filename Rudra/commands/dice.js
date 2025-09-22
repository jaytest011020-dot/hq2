const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "dice",
  version: "2.0.2",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Roll a dice and bet coins (1–4 lose, 5 x2, 6 x3, per GC toggle)",
  usages: "/dice <bet amount> | /dice on | /dice off | /dice status",
  commandCategory: "games",
  cooldowns: 5
};

function diceEmoji(number) {
  const emojis = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
  return emojis[number - 1] || "🎲";
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function formatDiceMessage(userName, diceNumber, bet, multiplier, balance) {
  let resultText = "❌ You lost!";
  if (multiplier === 2) resultText = "🌟 You won ×2!";
  else if (multiplier === 3) resultText = "🔥 You won ×3!";

  return (
    `🎲 Dice Game Result ✨🎲\n\n` +
    `👤 Player: ${userName}\n` +
    `🎲 Dice Roll: ${diceEmoji(diceNumber)} (${diceNumber})\n\n` +
    `💰 Bet: ${bet.toLocaleString()} coins\n` +
    `➡️ Result: ${resultText}\n` +
    `🏦 New Balance: ${balance.toLocaleString()} coins`
  );
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  // 🔹 Maintenance check
  const maintenance = await getData("/maintenance");
  if (maintenance?.enabled) {
    const mp4Path = path.join(__dirname, "cache", "AI data.mp4");
    return api.sendMessage(
      { body: "🚧 Bot under maintenance. Dice game disabled.", attachment: fs.existsSync(mp4Path) ? fs.createReadStream(mp4Path) : null },
      threadID,
      messageID
    );
  }

  // 🔹 Handle GC toggle: on/off/status (admins only)
  const command = args[0]?.toLowerCase();
  if (["on", "off", "status"].includes(command)) {
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);
    if (!isAdmin) return api.sendMessage("❌ Only GC admins can toggle dice.", threadID, messageID);

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
  if (!diceStatus.enabled) return api.sendMessage("❌ Dice game is disabled in this group.", threadID, messageID);

  // 🔹 Load user data
  const userName = await Users.getName(senderID) || `FB-User(${senderID})`;
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: userName, balance: 0 };
  userData.name = userName;

  // 🔹 Check bet
  const betArg = parseInt(args[0]);
  if (isNaN(betArg) || betArg <= 0) return api.sendMessage("❌ Specify a valid bet. Usage: /dice <bet amount>", threadID, messageID);
  if (betArg > userData.balance) return api.sendMessage("❌ You don't have enough coins.", threadID, messageID);

  // 🔹 Roll dice & determine multiplier
  const diceNumber = rollDice();
  let multiplier = 0;
  if (diceNumber === 5) multiplier = 2;
  else if (diceNumber === 6) multiplier = 3;

  // 🔹 Update balance
  if (multiplier === 0) userData.balance -= betArg;
  else userData.balance += betArg * multiplier;

  await setData(`bank/${threadID}/${senderID}`, userData);

  // 🔹 Send result
  const msg = formatDiceMessage(userName, diceNumber, betArg, multiplier, userData.balance);
  return api.sendMessage(msg, threadID, messageID);
};
