const { getData, setData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

// Slot symbols
const symbols = ["🍒", "🍋", "🍇", "🍀", "⭐", "💎"];

// 🔑 Fetch username
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

module.exports.config = {
  name: "slot",
  version: "2.4.1",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Play slot machine with coins (per GC bank system) with admin toggle + global maintenance respect",
  commandCategory: "Games",
  usages: "/slot <bet> | /slot on | /slot off | /slot status",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // 🔹 Handle /slot on/off/status toggle (GC admin only)
  if (["on", "off", "status"].includes(command)) {
    try {
      if (command === "status") {
        const slotStatus = (await getData(`slot/status/${threadID}`)) || { enabled: true };
        return api.sendMessage(
          `🎰 Slot system status: ${slotStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"}`,
          threadID
        );
      }

      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);
      if (!isAdmin) return api.sendMessage("❌ Only GC admins can toggle slot.", threadID);

      const enabled = command === "on";
      await setData(`slot/status/${threadID}`, { enabled });

      return api.sendMessage(
        `🎰 Slot system is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
        threadID
      );
    } catch (err) {
      console.error("[SLOT] Toggle error:", err);
      return api.sendMessage("⚠️ Failed to toggle slot.", threadID);
    }
  }

  // 🔒 Check global maintenance
  const maintenance = (await getData("system/maintenance")) || { enabled: false };
  if (maintenance.enabled) {
    const attachmentPath = path.join(__dirname, "cache", "maintenance.jpeg"); // new attachment
    return api.sendMessage(
      {
        body: "⚠️ Bot is under maintenance. Please try again later.",
        attachment: fs.existsSync(attachmentPath) ? fs.createReadStream(attachmentPath) : null
      },
      threadID
    );
  }

  // 🔹 Check if slot is enabled for this GC
  const slotStatus = (await getData(`slot/status/${threadID}`)) || { enabled: true };
  if (!slotStatus.enabled) {
    return api.sendMessage("❌ Slot is currently disabled by GC admin.", threadID);
  }

  // ✅ Load player balance
  let userBank = (await getData(`bank/${threadID}/${senderID}`)) || {
    balance: 0,
    name: await getUserName(senderID, api, Users)
  };

  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) return api.sendMessage("❌ Usage: /slot <bet>", threadID);

  if (userBank.balance < bet) return api.sendMessage("⚠️ You don't have enough coins!", threadID);

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

  // ✅ Save updated balance
  userBank.name = await getUserName(senderID, api, Users);
  await setData(`bank/${threadID}/${senderID}`, userBank);

  resultMsg += `\n\n👤 ${userBank.name}\n💳 Balance: ${userBank.balance.toLocaleString()} coins`;

  return api.sendMessage(resultMsg, threadID);
};
