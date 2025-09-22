const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "cg",
  version: "1.3.0",
  credits: "ChatGPT + Jaylord",
  hasPermission: 0,
  description: "Color game with betting system (uses bank balance)",
  usages: "/cg <color> <bet>",
  commandCategory: "games",
  cooldowns: 5
};

// 🎨 Available colors (8 total)
const colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "black"];
const colorEmojis = {
  red: "🔴",
  blue: "🔵",
  green: "🟢",
  yellow: "🟡",
  purple: "🟣",
  orange: "🟠",
  pink: "🌸",
  black: "⚫"
};

// 🎲 Draw 3 random colors
function drawColors() {
  const drawn = [];
  for (let i = 0; i < 3; i++) {
    drawn.push(colors[Math.floor(Math.random() * colors.length)]);
  }
  return drawn;
}

// 🔑 Fetch username with cache
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

  return `FB-User(${uid})`;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  // 🛠 Maintenance check
  const maintenance = await getData("/maintenance");
  if (maintenance?.enabled) {
    const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg");
    return api.sendMessage(
      {
        body: "🚧 Bot is under maintenance. Color Game disabled.",
        attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : null
      },
      threadID,
      messageID
    );
  }

  // 🏦 Check bank system
  const bankStatus = (await getData(`bank/status/${threadID}`)) || { enabled: true };
  if (!bankStatus.enabled)
    return api.sendMessage("❌ Bank system is disabled in this group.", threadID, messageID);

  // 🔹 Validate args
  if (args.length < 2) {
    return api.sendMessage(
      `❌ Usage: /cg <color> <bet>\n🎨 Available colors: ${colors.map(c => `${colorEmojis[c]} ${c}`).join(", ")}`,
      threadID,
      messageID
    );
  }

  const chosenColor = args[0].toLowerCase();
  if (!colors.includes(chosenColor)) {
    return api.sendMessage(
      `❌ Invalid color.\n🎨 Available colors: ${colors.map(c => `${colorEmojis[c]} ${c}`).join(", ")}`,
      threadID,
      messageID
    );
  }

  const bet = parseInt(args[1]);
  if (isNaN(bet) || bet <= 0)
    return api.sendMessage("❌ Please enter a valid bet amount.", threadID, messageID);

  // 🔹 Load user data
  const userName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: userName, balance: 0 };
  userData.name = userName;

  if (userData.balance < bet)
    return api.sendMessage(`❌ You don't have enough coins. Balance: ${userData.balance}`, threadID, messageID);

  // 🎲 Draw result
  const drawnColors = drawColors();
  const count = drawnColors.filter(c => c === chosenColor).length;

  let multiplier = 0;
  if (count === 1) multiplier = 2;
  else if (count === 2) multiplier = 3;
  else if (count === 3) multiplier = 5;

  let winnings = 0;
  if (multiplier > 0) {
    winnings = bet * multiplier;
    userData.balance += winnings;
  } else {
    userData.balance -= bet;
  }

  await setData(`bank/${threadID}/${senderID}`, userData);

  // 📝 Format result
  let msg = `🎨✨ COLOR GAME ✨🎨\n\n`;
  msg += `🎲 Drawn colors: ${drawnColors.map(c => colorEmojis[c]).join(" | ")}\n\n`;
  msg += `👤 Player: ${userName}\n💰 Bet: ${bet.toLocaleString()} coins\n🎯 Your color: ${colorEmojis[chosenColor]}\n\n`;

  if (count > 0) {
    msg += `🌟 Hits: ${count} time(s)\n💰 Multiplier: ×${multiplier}\n🏆 Winnings: ${winnings.toLocaleString()} coins\n\n`;
  } else {
    msg += `❌ Your color did not appear. You lost ${bet.toLocaleString()} coins.\n\n`;
  }

  msg += `🏦 New Balance: ${userData.balance.toLocaleString()} coins\n\n`;
  msg += `💡 Tip: 1 match ×2 | 2 matches ×3 | 3 matches ×5 (jackpot)`;

  return api.sendMessage(msg, threadID, messageID);
};
