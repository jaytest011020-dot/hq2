const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "lotto",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord",
  hasPermission: 0,
  description: "Lotto game 1-40 with 2 numbers, global prize pool, and instant draw",
  usages: "/lotto <num1> <num2> <bet>",
  commandCategory: "games",
  cooldowns: 5
};

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

// 🎲 Draw 2 unique numbers from 1–40
function drawWinningNumbers() {
  let nums = [];
  while (nums.length < 2) {
    const n = Math.floor(Math.random() * 40) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums;
}

// 🏦 Lotto global prize reset check
async function checkPrizeReset(threadID) {
  const now = Date.now();
  const lottoData = (await getData("lotto/global")) || { prize: 5000, lastReset: now };
  if (now - lottoData.lastReset >= 7 * 24 * 60 * 60 * 1000) { // 7 days
    lottoData.prize = 5000;
    lottoData.lastReset = now;
    await setData("lotto/global", lottoData);
  }
  return lottoData;
}

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, senderID, messageID } = event;

  // 🛠 Maintenance check
  const maintenance = await getData("/maintenance");
  if (maintenance?.enabled) {
    const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg");
    return api.sendMessage(
      {
        body: "🚧 Bot is under maintenance. Lotto disabled.",
        attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : null
      },
      threadID,
      messageID
    );
  }

  if (args.length < 3)
    return api.sendMessage("❌ Usage: /lotto <num1> <num2> <bet>\nNumbers must be 1-40.", threadID, messageID);

  let num1 = parseInt(args[0]);
  let num2 = parseInt(args[1]);
  const bet = parseInt(args[2]);

  if (isNaN(num1) || isNaN(num2) || num1 < 1 || num1 > 40 || num2 < 1 || num2 > 40)
    return api.sendMessage("❌ Numbers must be between 1 and 40.", threadID, messageID);

  if (num1 === num2)
    return api.sendMessage("❌ Numbers must be different.", threadID, messageID);

  // 🔹 Load user bank
  const userName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: userName, balance: 0 };
  userData.name = userName;

  if (isNaN(bet) || bet <= 0)
    return api.sendMessage("❌ Invalid bet amount.", threadID, messageID);

  if (userData.balance < bet)
    return api.sendMessage(`❌ Not enough coins. Balance: ${userData.balance}`, threadID, messageID);

  userData.balance -= bet;

  // 🎲 Draw winning numbers
  const winningNumbers = drawWinningNumbers();

  // 🔹 Check global prize
  let lottoData = await checkPrizeReset(threadID);

  // 🔹 Check matches
  let matchCount = 0;
  if (winningNumbers.includes(num1)) matchCount++;
  if (winningNumbers.includes(num2)) matchCount++;

  let winnings = 0;
  let resultText = "";

  if (matchCount === 2) {
    winnings = lottoData.prize;
    resultText = `🎉 JACKPOT! You won ${winnings.toLocaleString()} coins!`;
    userData.balance += winnings;
    lottoData.prize = 5000; // reset prize
  } else if (matchCount === 1) {
    winnings = bet * 2;
    resultText = `🌟 Partial win! You got ${winnings.toLocaleString()} coins!`;
    userData.balance += winnings;
    lottoData.prize += bet; // add losing bet to global prize
  } else {
    resultText = `❌ No match. Better luck next time!`;
    lottoData.prize += bet; // add losing bet to global prize
  }

  await setData(`bank/${threadID}/${senderID}`, userData);
  await setData("lotto/global", lottoData);

  // 📝 Format message
  let msg = `🎰 LOTTO DRAW 🎰\n\n`;
  msg += `🎲 Winning Numbers: ${winningNumbers.join(" & ")}\n\n`;
  msg += `👤 Player: ${userName}\n`;
  msg += `🧾 Your Bet: ${num1} & ${num2}\n`;
  msg += `${resultText}\n\n`;
  msg += `🏦 Your Balance: ${userData.balance.toLocaleString()} coins\n`;
  msg += `💰 Global Prize Pool: ${lottoData.prize.toLocaleString()} coins`;

  return api.sendMessage(msg, threadID, messageID);
};
