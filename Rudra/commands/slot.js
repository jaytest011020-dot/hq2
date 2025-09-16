// === modules/commands/slot.js ===
const { getData, setData } = require("../../database.js");

// Slot symbols
const symbols = ["🍒", "🍋", "🍇", "🍀", "⭐", "💎"];

module.exports.config = {
  name: "slot",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "ChatGPT + Firebase refactor",
  description: "Play slot machine with coins",
  commandCategory: "Games",
  usages: "/slot <amount>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;

  // ✅ Load player balance from DB
  let userBank = (await getData(`/bank/${senderID}`)) || { balance: 0 };

  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) {
    return api.sendMessage("❌ Usage: /slot <bet>", threadID);
  }

  if (userBank.balance < bet) {
    return api.sendMessage("⚠️ You don't have enough coins!", threadID);
  }

  // Deduct bet
  userBank.balance -= bet;

  // Roll slots
  const roll = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  let resultMsg = `🎰 SLOT MACHINE 🎰\n[ ${roll.join(" | ")} ]\n\n`;

  // Check winnings
  if (roll[0] === roll[1] && roll[1] === roll[2]) {
    const win = bet * 5;
    userBank.balance += win;
    resultMsg += `✨ JACKPOT! 3 in a row! You won 💰 ${win.toLocaleString()} coins.`;
  } else if (roll[0] === roll[1] || roll[1] === roll[2] || roll[0] === roll[2]) {
    const win = bet * 2;
    userBank.balance += win;
    resultMsg += `✅ 2 matches! You won 💰 ${win.toLocaleString()} coins.`;
  } else {
    resultMsg += `❌ You lost your bet of ${bet.toLocaleString()} coins.`;
  }

  // ✅ Save updated balance to DB
  await setData(`/bank/${senderID}`, userBank);

  const name = await Users.getNameUser(senderID);
  resultMsg += `\n\n👤 ${name}\n💳 Balance: ${userBank.balance.toLocaleString()} coins`;

  return api.sendMessage(resultMsg, threadID);
};
