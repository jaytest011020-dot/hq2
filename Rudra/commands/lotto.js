const { setData, getData } = require("../../database.js");
const cron = require("node-cron");

const ENTRY_COST = 100;
const MAX_NUMBER = 40;
const STARTING_PRIZE = 5000;
const DRAW_TIMES = "0 6,10,14,18,22,2 * * *"; // 6AM,10AM,2PM,6PM,10PM,2AM

module.exports.config = {
  name: "lotto",
  version: "1.4.0",
  credits: "Jaylord La Peña + ChatGPT",
  hasPermission: 0,
  description: "2-number lotto game with toggle, auto draw, prize rollover, multiple winners",
  usages: "/lotto <num1> <num2> OR /lotto on|off",
  commandCategory: "games",
  cooldowns: 3,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  if (!args[0]) return api.sendMessage("❌ Usage: /lotto <num1> <num2> OR /lotto on|off", threadID, messageID);

  const cmd = args[0]?.toLowerCase()?.trim();

  // Toggle logic
  if (cmd === "on" || cmd === "off") {
    let status = (await getData(`lottoStatus/${threadID}`)) || { enabled: true };
    status.enabled = cmd === "on";
    await setData(`lottoStatus/${threadID}`, status);
    return api.sendMessage(
      status.enabled ? "✅ Lotto game is now ENABLED in this chat." : "⛔ Lotto game is now DISABLED in this chat.",
      threadID,
      messageID
    );
  }

  // Check if lotto is enabled
  let status = (await getData(`lottoStatus/${threadID}`)) || { enabled: true };
  if (!status.enabled) return api.sendMessage("⛔ Lotto game is currently disabled in this chat.", threadID, messageID);

  // Ticket purchase logic
  const num1 = parseInt(args[0]);
  const num2 = parseInt(args[1]);

  if (!num1 || !num2 || num1 < 1 || num2 < 1 || num1 > MAX_NUMBER || num2 > MAX_NUMBER || num1 === num2) {
    return api.sendMessage(`❌ Usage: /lotto <num1> <num2> (1-${MAX_NUMBER}, no duplicates)`, threadID, messageID);
  }

  // Load player bank
  let playerData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0, name: "Unknown" };
  if (playerData.balance < ENTRY_COST) return api.sendMessage(`❌ Not enough coins. Balance: ${playerData.balance}`, threadID, messageID);

  // Load current entries
  let entries = (await getData(`lotto/${threadID}`)) || {};

  // Notify if player already has a ticket
  if (entries[senderID]) {
    return api.sendMessage(
      `⚠️ You already have a ticket for the current draw! Numbers: ${entries[senderID].num1}, ${entries[senderID].num2}`,
      threadID,
      messageID
    );
  }

  // Deduct entry cost and save ticket
  playerData.balance -= ENTRY_COST;
  await setData(`bank/${threadID}/${senderID}`, playerData);

  entries[senderID] = { num1, num2 };
  await setData(`lotto/${threadID}`, entries);

  api.sendMessage(
    `🎟️ Ticket bought! Numbers: ${num1}, ${num2}\n💵 Remaining balance: ${playerData.balance}`,
    threadID,
    messageID
  );
};

// Automatic draw every 4 hours
cron.schedule(DRAW_TIMES, async () => {
  const threadID = "GLOBAL_LOTTO_THREAD";

  const entries = (await getData(`lotto/${threadID}`)) || {};
  let currentPrize = (await getData(`lottoPrize/${threadID}`)) || STARTING_PRIZE;

  // Pick 2 random winning numbers
  const winningNumbers = [];
  while (winningNumbers.length < 2) {
    const n = 1 + Math.floor(Math.random() * MAX_NUMBER);
    if (!winningNumbers.includes(n)) winningNumbers.push(n);
  }

  let winners = [];
  let msg = `🎉 | LOTTO DRAW RESULTS\n────────────────────\n🎯 Winning Numbers: ${winningNumbers.join(", ")}\n💰 Current Prize: ${currentPrize}\n`;

  // Check winners
  for (let playerID in entries) {
    const ticket = entries[playerID];
    if (ticket.num1 === winningNumbers[0] && ticket.num2 === winningNumbers[1]) {
      winners.push(playerID);
    }
  }

  let nextPrize = STARTING_PRIZE;

  if (winners.length > 0) {
    // Split prize among all winners
    const prizePerWinner = Math.floor(currentPrize / winners.length);
    msg += `🏆 🎊 CONGRATULATIONS! 🎊 🏆\nWinners:\n`;
    for (let playerID of winners) {
      let playerData = (await getData(`bank/${threadID}/${playerID}`)) || { balance: 0 };
      playerData.balance += prizePerWinner;
      await setData(`bank/${threadID}/${playerID}`, playerData);
      msg += `- <@${playerID}> → ${prizePerWinner} coins 🎉💰\n`;
    }
    nextPrize = STARTING_PRIZE; // reset for next round
    msg += `\n✨ The prize resets to ${STARTING_PRIZE} coins for the next draw! ✨\n`;
  } else {
    // No winner → rollover
    msg += `❌ No winners this round. Prize rolls over!\n`;
    const totalTaya = Object.keys(entries).length * ENTRY_COST;
    nextPrize = currentPrize + totalTaya;
  }

  msg += `────────────────────\n🎯 Next Prize: ${nextPrize} coins`;

  await setData(`lottoPrize/${threadID}`, nextPrize);
  await setData(`lotto/${threadID}`, {}); // clear tickets

  api.sendMessage(msg, threadID);
});
