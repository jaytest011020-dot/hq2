const { getData, setData } = require("../../database.js");
const { ADMINBOT } = global.config;
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "dice",
  version: "1.8.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Roll a dice and bet coins (50% chance to win, bet required, respects maintenance mode with attachment)",
  usages: "/dice <bet amount>",
  commandCategory: "games",
  cooldowns: 5
};

// 🔑 Fetch username with global cache
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

// 🔹 Dice emoji representation
function diceEmoji(number) {
  const emojis = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"]; // ⚀⚁⚂⚃⚄⚅
  return emojis[number - 1] || "🎲";
}

// 🔹 Roll the dice
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// 🔹 Decide win or lose (fixed 50% chance)
function isWinner() {
  return Math.random() < 0.5; // 50% chance
}

// 🔹 Format dice result message
function formatDiceMessage(userName, diceNumber, bet, won, balance) {
  let msg = "🎲✨ Dice Game Result ✨🎲\n\n";
  msg += "👤 Player: " + userName + "\n";
  msg += "🎲 Dice Roll: " + diceEmoji(diceNumber) + " (" + diceNumber + ")\n\n";

  msg += "💰 Bet: " + bet.toLocaleString() + " coins\n";
  msg += "🎯 Win Chance: 50%\n";
  msg += won
    ? "🌟 Congratulations! You won " + bet.toLocaleString() + " coins!\n"
    : "😢 Sorry! You lost " + bet.toLocaleString() + " coins.\n";
  msg += "🏦 New Balance: " + balance.toLocaleString() + " coins\n";

  if (diceNumber === 6) msg += "\n🔥 Lucky roll! Maximum dice!";
  else if (diceNumber === 1) msg += "\n❄️ Unlucky roll! Minimum dice!";
  else msg += "\n🙂 Nice roll!";

  return msg;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  // 🔹 Check maintenance mode
  try {
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) {
      const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg"); // Dice command folder cache
      return api.sendMessage(
        {
          body: "🚧 Bot is currently under maintenance. Dice game is temporarily disabled.",
          attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : undefined,
        },
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error("Maintenance check failed:", err);
  }

  // 🔹 Check bank system status
  const bankStatus = (await getData(`bank/status/${threadID}`)) || { enabled: true };
  if (!bankStatus.enabled) return api.sendMessage("❌ Bank system is disabled in this group.", threadID, messageID);

  const freshName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };
  userData.name = freshName;

  // 🔹 Bet is mandatory
  let bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) return api.sendMessage("❌ You must specify a valid bet amount. Usage: /dice <bet amount>", threadID, messageID);
  if (bet > userData.balance) return api.sendMessage("❌ You don't have enough coins to bet that amount.", threadID, messageID);

  // 🔹 Roll dice
  const diceNumber = rollDice();
  const won = isWinner();

  if (won) userData.balance += bet;
  else userData.balance -= bet;

  await setData(`bank/${threadID}/${senderID}`, userData);

  const msg = formatDiceMessage(freshName, diceNumber, bet, won, userData.balance);
  return api.sendMessage(msg, threadID, messageID);
};
