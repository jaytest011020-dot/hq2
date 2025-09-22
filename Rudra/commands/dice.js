const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "dice",
  version: "2.0.2",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Roll a dice and bet coins (1–4 lose, 5 x2, 6 x3) with per-GC toggle",
  usages: "/dice <bet> | /dice on | /dice off | /dice status",
  commandCategory: "games",
  cooldowns: 5
};

// Dice emojis
const diceEmojis = ["\u2680","\u2681","\u2682","\u2683","\u2684","\u2685"];

// Roll dice
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;
  const command = args[0]?.toLowerCase();

  // 🔹 Global maintenance check
  const maintenance = await getData("/maintenance") || { enabled: false };
  if (maintenance.enabled) {
    const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg");
    return api.sendMessage(
      {
        body: "🚧 Bot is under maintenance. Dice game disabled.",
        attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : null
      },
      threadID,
      messageID
    );
  }

  // 🔹 Handle per-GC toggle (admins only)
  if (["on","off","status"].includes(command)) {
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

  // 🔹 Check if dice is enabled for this GC
  const diceStatus = (await getData(`dice/status/${threadID}`)) || { enabled: true };
  if (!diceStatus.enabled) 
    return api.sendMessage("❌ Dice game is disabled in this group.", threadID, messageID);

  // 🔹 Load user data
  const userName = await Users.getName(senderID).catch(() => `FB-User(${senderID})`);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: userName, balance: 0 };
  userData.name = userName;

  // 🔹 Check bet
  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) 
    return api.sendMessage("❌ Specify a valid bet. Usage: /dice <bet amount>", threadID, messageID);
  if (userData.balance < bet) 
    return api.sendMessage(`❌ You don't have enough coins! Your balance: ${userData.balance}`, threadID, messageID);

  // 🔹 Roll dice & calculate result
  const diceNumber = rollDice();
  let multiplier = 0;
  if (diceNumber === 5) multiplier = 2;
  else if (diceNumber === 6) multiplier = 3;

  // 🔹 Update balance
  userData.balance += multiplier === 0 ? -bet : bet * multiplier;
  await setData(`bank/${threadID}/${senderID}`, userData);

  // 🔹 Prepare result message
  const resultText = multiplier === 0 ? "❌ You lost!" : multiplier === 2 ? "🌟 You won ×2!" : "🔥 You won ×3!";
  const msg = `🎲 Dice Game Result ✨🎲\n\n👤 Player: ${userName}\n🎲 Dice Roll: ${diceEmojis[diceNumber-1]} (${diceNumber})\n\n💰 Bet: ${bet}\n➡️ Result: ${resultText}\n🏦 New Balance: ${userData.balance}`;

  return api.sendMessage(msg, threadID, messageID);
};
