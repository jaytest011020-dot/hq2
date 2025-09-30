const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pin",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Pin messages in the GC",
  usePrefix: true,
  commandCategory: "tools",
  usages: "/pin add | /pin list | /pin remove <id> | /pin clear",
  cooldowns: 5,
};

// Helpers
async function getPins(threadID) {
  return (await getData(`pins/${threadID}`)) || [];
}
async function savePins(threadID, pins) {
  await setData(`pins/${threadID}`, pins);
}

// Format pin list with spacing
async function formatPins(pins, api) {
  let msg = "📌 Pinned messages:\n\n";
  for (let i = 0; i < pins.length; i++) {
    const p = pins[i];
    let name = "Unknown";
    try {
      const info = await api.getUserInfo(p.author);
      name = info?.[p.author]?.name || "Unknown";
    } catch {}
    msg += `${i + 1}. ${p.text}\n   👤 by ${name}\n   🕒 ${p.date}\n\n`;
  }
  return msg.trim();
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, messageReply, senderID } = event;
  const option = (args[0] || "").toLowerCase();

  // Add pin (must reply)
  if (option === "add") {
    if (!messageReply || !messageReply.body) {
      return api.sendMessage("⚠️ Please reply to a text message to pin it.", threadID, messageID);
    }
    const pins = await getPins(threadID);
    const newPin = {
      text: messageReply.body,
      author: senderID,
      date: new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }),
    };
    pins.push(newPin);
    await savePins(threadID, pins);
    return api.sendMessage(`📌 Pinned:\n"${messageReply.body}"`, threadID, messageID);
  }

  // Remove pin by ID
  if (option === "remove") {
    const id = parseInt(args[1]);
    if (isNaN(id)) return api.sendMessage("⚠️ Usage: /pin remove <id>", threadID, messageID);
    let pins = await getPins(threadID);
    if (id < 1 || id > pins.length) return api.sendMessage("⚠️ Invalid pin ID.", threadID, messageID);
    const removed = pins.splice(id - 1, 1);
    await savePins(threadID, pins);
    return api.sendMessage(`❌ Removed pin:\n"${removed[0].text}"`, threadID, messageID);
  }

  // Clear all pins
  if (option === "clear") {
    await savePins(threadID, []);
    return api.sendMessage("🧹 All pins cleared.", threadID, messageID);
  }

  // List pins
  const pins = await getPins(threadID);
  if (pins.length === 0) {
    return api.sendMessage("❌ No pinned messages yet.", threadID, messageID);
  }
  const msg = await formatPins(pins, api);
  return api.sendMessage(msg, threadID, messageID);
};

// Auto-detect "pin" keyword
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, body, messageID } = event;
  if (!body) return;

  if (/^pin$/i.test(body.trim())) {
    const pins = await getPins(threadID);
    if (pins.length === 0) {
      return api.sendMessage("❌ No pinned messages yet.", threadID, messageID);
    }
    const msg = await formatPins(pins, api);
    return api.sendMessage(msg, threadID, messageID);
  }
};
