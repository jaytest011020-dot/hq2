const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "dice",
  version: "2.4.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Roll a dice, bet coins, and apply pet coin boost (capped at 30%)",
  usages: "/dice <bet>",
  commandCategory: "games",
  cooldowns: 5
};

// 🔑 Get username with cache
async function getUserName(uid, api, Users) {
  let cachedName = global.data.userName.get(uid);
  if (cachedName) return cachedName;

  try {
    const info = await api.getUserInfo(uid);
    const name = Object.values(info)[0]?.name || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch {}

  try {
    const name = await Users.getName(uid) || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch {}

  const fallbackName = `FB-User(${uid})`;
  global.data.userName.set(uid, fallbackName);
  return fallbackName;
}

// 🎲 Dice emojis
function diceEmoji(number) {
  const emojis = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
  return emojis[number - 1] || "🎲";
}

// 🎲 Roll dice
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// 🎲 Format result message
function formatDiceMessage(userName, diceNumber, bet, baseWin, petBonus, balance) {
  let msg = `🎲 Dice Game Result 🎲\n\n`;
  msg += `👤 Player: ${userName}\n`;
  msg += `🎲 Dice Roll: ${diceEmoji(diceNumber)} (${diceNumber})\n\n`;
  msg += `💰 Bet: ${bet.toLocaleString()} coins\n`;

  if (baseWin >= 0) {
    msg += `➡️ Base Win: ${baseWin.toLocaleString()} coins\n`;
    if (petBonus > 0) msg += `✨ Pet Bonus: ${petBonus.toLocaleString()} coins\n`;
  } else {
    msg += `➡️ Loss: ${Math.abs(baseWin).toLocaleString()} coins\n`;
  }

  msg += `🏦 New Balance: ${balance.toLocaleString()} coins\n`;

  if (diceNumber === 6) msg += "\n🔥 Lucky roll! Maximum dice!";
  else if (diceNumber === 1) msg += "\n❄️ Unlucky roll! Minimum dice!";
  else msg += "\n🙂 Better luck next time!";

  return msg;
}

// ✅ Main command
module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0)
    return api.sendMessage("❌ Specify a valid bet. Usage: /dice <bet amount>", threadID, messageID);

  const freshName = await getUserName(senderID, api, Users);
  let userBank = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };

  if (userBank.balance < bet)
    return api.sendMessage(`❌ You don't have enough coins! Your balance: ${userBank.balance}`, threadID, messageID);

  // 🎲 Roll dice & compute result
  const diceNumber = rollDice();
  let baseWin = 0;
  if (diceNumber >= 1 && diceNumber <= 4) baseWin = -bet;
  else if (diceNumber === 5) baseWin = bet;
  else if (diceNumber === 6) baseWin = bet * 2;

  // 🔹 Apply pet boost (capped at 30%)
  const pet = (await getData(`pets/${threadID}/${senderID}`)) || null;
  let petBonus = 0;
  if (baseWin > 0 && pet?.skills?.coinBoost) {
    const boostPercent = Math.min(pet.skills.coinBoost, 0.3); // cap at 30%
    petBonus = Math.floor(baseWin * boostPercent);
  }

  // 🔹 Update balance
  userBank.balance += baseWin + petBonus;
  await setData(`bank/${threadID}/${senderID}`, userBank);

  // 🔹 Send result
  const msg = formatDiceMessage(freshName, diceNumber, bet, baseWin, petBonus, userBank.balance);
  return api.sendMessage(msg, threadID, messageID);
};
