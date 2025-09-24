const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "dice",
  version: "2.3.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Roll a dice, bet coins, and apply pet coin boost",
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
  const emojis = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
  return emojis[number - 1] || "🎲";
}

// 🎲 Roll dice
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// 🎲 Format result message
function formatDiceMessage(userName, diceNumber, bet, baseWin, petBonus, balance) {
  let msg = `🎲 Dice Game Result ✨🎲\n\n`;
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

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  const firstArg = args[0];
  const command = firstArg?.toLowerCase();
  const bet = parseInt(firstArg);

  // 🔹 Load user bank
  const freshName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };
  userData.name = freshName;

  // 🔹 Load user pet
  const pet = (await getData(`pets/${threadID}/${senderID}`)) || null;
  const petCoinBoost = pet?.skills?.coinBoost || 0;

  // 🔹 Validate bet
  if (isNaN(bet) || bet <= 0)
    return api.sendMessage("❌ Specify a valid bet. Usage: /dice <bet amount>", threadID, messageID);
  if (userData.balance < bet)
    return api.sendMessage(`❌ You don't have enough coins! Your balance: ${userData.balance}`, threadID, messageID);

  // 🎲 Roll dice & compute result
  const diceNumber = rollDice();
  let baseWin = 0;
  if (diceNumber >= 1 && diceNumber <= 4) {
    baseWin = -bet; // loss
  } else if (diceNumber === 5) {
    baseWin = bet; // win ×2 total
  } else if (diceNumber === 6) {
    baseWin = bet * 2; // win ×3 total
  }

  // 🔹 Apply pet coin boost if win
  let petBonus = 0;
  if (baseWin > 0 && petCoinBoost > 0) {
    petBonus = Math.floor(baseWin * petCoinBoost);
  }

  // 🔹 Update bank
  userData.balance += baseWin + petBonus;
  await setData(`bank/${threadID}/${senderID}`, userData);

  // 🔹 Send result
  const msg = formatDiceMessage(freshName, diceNumber, bet, baseWin, petBonus, userData.balance);
  return api.sendMessage(msg, threadID, messageID);
};
