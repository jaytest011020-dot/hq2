const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "lotto",
  version: "1.2.0",
  credits: "ChatGPT + Jaylord",
  hasPermission: 0,
  description: "Lotto game 1-40 with 2 numbers, fixed bet 500, global prize, instant draw, duplicates allowed",
  usages: "/lotto <num1> <num2>",
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
  } catch {}

  try {
    const name = await Users.getName(uid) || `FB-User(${uid})`;
    global.data.userName.set(uid, name);
    return name;
  } catch {}

  return `FB-User(${uid})`;
}

// 🎲 Draw 2 numbers from 1–40, duplicates allowed
function drawWinningNumbers() {
  return [Math.floor(Math.random() * 40) + 1, Math.floor(Math.random() * 40) + 1];
}

// 🏦 Lotto global prize reset check (every Sunday)
async function checkPrizeReset() {
  const now = new Date();
  const today = now.getDay(); // 0 = Sunday
  let lottoData = (await getData("lotto/global")) || { prize: 100000, lastReset: now.getTime() };

  if (today === 0 && (!lottoData.lastReset || new Date(lottoData.lastReset).getDay() !== 0)) {
    lottoData.prize = 100000;
    lottoData.lastReset = now.getTime();
    await setData("lotto/global", lottoData);
  }

  return lottoData;
}

module.exports.run = async function({ api, event, Users }) {
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

  // Log the args to see what values are being passed
  console.log("Received args:", event.args);

  // Validate if there are exactly two arguments
  if (event.args.length !== 2)
    return api.sendMessage("❌ Usage: /lotto <num1> <num2>\nNumbers must be 1-40.", threadID, messageID);

  let num1 = parseInt(event.args[0]);
  let num2 = parseInt(event.args[1]);
  const bet = 500; // fixed bet

  // Validate if numbers are between 1 and 40
  if (isNaN(num1) || isNaN(num2) || num1 < 1 || num1 > 40 || num2 < 1 || num2 > 40)
    return api.sendMessage("❌ Numbers must be between 1 and 40.", threadID, messageID);

  // Validate if the two numbers are the same
  if (num1 === num2)
    return api.sendMessage("❌ Numbers must be different.", threadID, messageID);

  // 🔹 Load user bank
  const userName = await getUserName(senderID, api, Users);
  let userData = (await getData(`bank/${threadID}/${senderID}`)) || { name: userName, balance: 0 };
  userData.name = userName;

  if (userData.balance < bet)
    return api.sendMessage(`❌ Not enough coins. Balance: ${userData.balance}`, threadID, messageID);

  userData.balance -= bet;

  // 🎲 Draw winning numbers (duplicates allowed)
  const winningNumbers = drawWinningNumbers();

  // 🔹 Check global prize
  let lottoData = await checkPrizeReset();

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
    lottoData.prize = 100000; // reset prize
  } else if (matchCount === 1) {
    winnings = bet * 2;
    resultText = `🌟 Partial win! You got ${winnings.toLocaleString()} coins!`;
    userData.balance += winnings;
    lottoData.prize += bet; // losing bet goes to prize
  } else {
    resultText = `❌ No match. Better luck next time!`;
    lottoData.prize += bet; // losing bet goes to prize
  }

  await setData(`bank/${threadID}/${senderID}`, userData);
  await setData("lotto/global", lottoData);

  // 📝 Format message
  let msg = `🎰 LOTTO DRAW 🎰\n\n`;
  msg += `🎲 Winning Numbers: ${winningNumbers.join(" & ")}\n\n`;
  msg += `👤 Player: ${userName}\n`;
  msg += `🧾 Your Bet: ${num1} & ${num2} (500 coins)\n`;
  msg += `${resultText}\n\n`;
  msg += `🏦 Your Balance: ${userData.balance.toLocaleString()} coins\n`;
  msg += `💰 Global Prize Pool: ${lottoData.prize.toLocaleString()} coins`;

  return api.sendMessage(msg, threadID, messageID);
};
