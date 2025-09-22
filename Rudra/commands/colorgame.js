const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");
const { ADMINBOT } = global.config;

module.exports.config = {
  name: "colorgame",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord La Peña",
  hasPermission: 0,
  description: "Bet on colors! 3 colors will be drawn, duplicate colors multiply your winnings",
  usages: "/colorgame <color> <bet>",
  commandCategory: "games",
  cooldowns: 5,
};

// 6 available colors
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];

// Randomly select n colors with replacement
function drawColors(n = 3) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    drawn.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
  }
  return drawn;
}

// Fetch username with global cache
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

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  // --- Maintenance check ---
  try {
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) {
      const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg");
      return api.sendMessage({
        body: "🚧 Bot is under maintenance. Color game disabled.",
        attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : null
      }, threadID, messageID);
    }
  } catch (err) { console.error(err); }

  // Validate args
  if (!args[0] || !args[1]) {
    return api.sendMessage(
      `❌ Usage: /colorgame <color> <bet>\nAvailable colors: ${COLORS.join(", ")}`, 
      threadID, 
      messageID
    );
  }

  const chosenColor = args[0].toLowerCase();
  if (!COLORS.includes(chosenColor)) {
    return api.sendMessage(
      `❌ Invalid color. Available colors: ${COLORS.join(", ")}`, 
      threadID, 
      messageID
    );
  }

  const bet = parseInt(args[1]);
  if (isNaN(bet) || bet <= 0) {
    return api.sendMessage("❌ You must enter a valid bet amount.", threadID, messageID);
  }

  // Load user bank
  const freshName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: freshName, balance: 0 };
  userData.name = freshName;

  if (userData.balance < bet) {
    return api.sendMessage(`❌ You don't have enough coins. Your balance: ${userData.balance}`, threadID, messageID);
  }

  // Deduct bet
  userData.balance -= bet;

  // Draw 3 colors
  const drawnColors = drawColors(3);

  // Count how many times chosen color appeared
  const count = drawnColors.filter(c => c === chosenColor).length;

  // Calculate winnings
  let multiplier = 0;
  if (count === 1) multiplier = 2;
  else if (count === 2) multiplier = 3;
  else if (count === 3) multiplier = 5;

  const winnings = bet * multiplier;
  if (multiplier > 0) userData.balance += winnings;

  await setData(`bank/${threadID}/${senderID}`, userData);

  // Build result message
  let msg = `🎨 Color Game Result 🎨\n\n`;
  msg += `👤 Player: ${freshName}\n`;
  msg += `💰 Bet: ${bet} coins\n`;
  msg += `🎲 Drawn colors: ${drawnColors.join(" | ")}\n`;
  msg += count > 0 
    ? `🌟 Your color "${chosenColor}" appeared ${count} time(s)! Multiplier ×${multiplier}\n💰 You won ${winnings} coins!`
    : `❌ Your color "${chosenColor}" did not appear. You lost ${bet} coins.`;
  msg += `\n🏦 New Balance: ${userData.balance.toLocaleString()} coins`;

  return api.sendMessage(msg, threadID, messageID);
};
