const { setData, getData } = require("../../database.js");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const ENTRY_COST = 100;
const MAX_NUMBER = 40;
const STARTING_PRIZE = 5000;
const DRAW_TIMES = "0 6,10,14,18,22,2 * * *"; // every 4hrs

module.exports.config = {
  name: "lotto",
  version: "2.1.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "2-number lotto game with toggle, auto draw, persistent global prize & tickets",
  usages: "/lotto <num1> <num2> OR /lotto on|off",
  commandCategory: "games",
  cooldowns: 3,
};

// 🔹 Function to start cron for auto draw (persistent)
async function startLottoCron(api) {
  const allStatuses = (await getData("lottoStatus")) || {};
  const anyEnabled = Object.values(allStatuses).some(s => s.enabled);
  if (!anyEnabled) return; // no GC has lotto enabled

  cron.schedule(DRAW_TIMES, async () => {
    let allEntries = {};
    for (let threadID in allStatuses) {
      if (!allStatuses[threadID].enabled) continue;
      let entries = (await getData(`lottoEntries/${threadID}`)) || {};
      allEntries[threadID] = entries;
    }

    let currentPrize = (await getData("lottoGlobalPrize")) || STARTING_PRIZE;

    // Pick winning numbers
    const winningNumbers = [];
    while (winningNumbers.length < 2) {
      const n = 1 + Math.floor(Math.random() * MAX_NUMBER);
      if (!winningNumbers.includes(n)) winningNumbers.push(n);
    }

    let winners = [];
    let msg = `🎉 | GLOBAL LOTTO DRAW RESULTS\n────────────────────\n🎯 Winning Numbers: ${winningNumbers.join(", ")}\n💰 Prize Pool: ${currentPrize}\n`;

    for (let threadID in allEntries) {
      const entries = allEntries[threadID];
      for (let playerID in entries) {
        const ticket = entries[playerID];
        if (ticket.num1 === winningNumbers[0] && ticket.num2 === winningNumbers[1]) {
          winners.push({ threadID, playerID });
        }
      }
    }

    let nextPrize = STARTING_PRIZE;
    if (winners.length > 0) {
      const prizePerWinner = Math.floor(currentPrize / winners.length);
      msg += `🏆 🎊 WINNERS 🎊 🏆\n`;
      for (let win of winners) {
        let playerData = (await getData(`bank/${win.threadID}/${win.playerID}`)) || { balance: 0 };
        playerData.balance += prizePerWinner;
        await setData(`bank/${win.threadID}/${win.playerID}`, playerData);
        msg += `- <@${win.playerID}> → ${prizePerWinner} coins 🎉💰\n`;
      }
      nextPrize = STARTING_PRIZE;
    } else {
      msg += `❌ No winners this round. Prize pool rolls over!\n`;
      nextPrize = currentPrize;
    }

    msg += `────────────────────\n🎯 Next Prize Pool: ${nextPrize}`;

    await setData("lottoGlobalPrize", nextPrize);

    for (let threadID in allEntries) {
      await setData(`lottoEntries/${threadID}`, {}); // clear tickets
    }

    for (let threadID in allStatuses) {
      if (allStatuses[threadID].enabled) api.sendMessage(msg, threadID);
    }
  });
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // 🔍 Maintenance check
  const maintenance = await getData("/maintenance");
  if (maintenance?.enabled) {
    const imgPath = path.join(__dirname, "cache", "maintenance.jpeg"); // bagong attachment
    return api.sendMessage(
      { body: "🚧 Bot is under maintenance. Lotto disabled.", attachment: fs.existsSync(imgPath) ? fs.createReadStream(imgPath) : null },
      threadID,
      messageID
    );
  }

  if (!args[0]) return api.sendMessage("❌ Usage: /lotto <num1> <num2> OR /lotto on|off", threadID, messageID);

  const cmd = args[0]?.toLowerCase()?.trim();

  // 🔹 Toggle lotto per GC
  if (cmd === "on" || cmd === "off") {
    let status = (await getData(`lottoStatus/${threadID}`)) || { enabled: true };
    status.enabled = cmd === "on";
    await setData(`lottoStatus/${threadID}`, status);
    return api.sendMessage(status.enabled ? "✅ Lotto ENABLED in this chat." : "⛔ Lotto DISABLED in this chat.", threadID, messageID);
  }

  // 🔹 Check lotto enabled
  let lottoStatus = (await getData(`lottoStatus/${threadID}`)) || { enabled: true };
  if (!lottoStatus.enabled) return api.sendMessage("⛔ Lotto disabled in this chat.", threadID, messageID);

  // 🔹 Validate numbers
  const num1 = parseInt(args[0]);
  const num2 = parseInt(args[1]);
  if (!num1 || !num2 || num1 < 1 || num2 < 1 || num1 > MAX_NUMBER || num2 > MAX_NUMBER || num1 === num2) {
    return api.sendMessage(`❌ /lotto <num1> <num2> (1-${MAX_NUMBER}, no duplicates)`, threadID, messageID);
  }

  // 🔹 Load bank
  let playerData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0, name: "Unknown" };
  if (playerData.balance < ENTRY_COST) return api.sendMessage(`❌ Not enough coins. Balance: ${playerData.balance}`, threadID, messageID);

  // Deduct entry
  playerData.balance -= ENTRY_COST;
  await setData(`bank/${threadID}/${senderID}`, playerData);

  // Save ticket
  let entries = (await getData(`lottoEntries/${threadID}`)) || {};
  if (entries[senderID]) return api.sendMessage(`⚠️ You already have a ticket! Numbers: ${entries[senderID].num1}, ${entries[senderID].num2}`, threadID, messageID);
  entries[senderID] = { num1, num2 };
  await setData(`lottoEntries/${threadID}`, entries);

  // Update global prize
  let globalPrize = (await getData("lottoGlobalPrize")) || STARTING_PRIZE;
  globalPrize += ENTRY_COST;
  await setData("lottoGlobalPrize", globalPrize);

  api.sendMessage(`🎟️ Ticket bought! Numbers: ${num1}, ${num2}\n💵 Remaining balance: ${playerData.balance}\n💰 Current Prize Pool: ${globalPrize}`, threadID, messageID);
};

// ✅ Export the cron starter for main bot file
module.exports.startCron = startLottoCron;
