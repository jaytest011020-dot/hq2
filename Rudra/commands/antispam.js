const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "spamkick",
  version: "1.2.0",
  hasPermssion: 1,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Auto kick users who spam messages (Only Jaylord can control)",
  commandCategory: "moderation",
  usages: `
📌 /spamkick on <limit>
   - Enable spam auto-kick (set limit, e.g. 10 messages)

📌 /spamkick off
   - Disable spam auto-kick

📌 /spamkick status
   - Check current spam auto-kick settings
`,
  cooldowns: 5
};

let spamCache = {}; // memory cache per thread

// 🔒 Protected UIDs (cannot be kicked or flagged for spam)
const PROTECTED_UIDS = ["61559999326713", "61554885397487"];
const OWNER_UID = "61559999326713"; // Only Jaylord can control commands

// 🧩 Main Command
module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // ✅ Only Jaylord can control
  if (senderID !== OWNER_UID) {
    return api.sendMessage("❌ Only Jaylord La Peña can use this command.", threadID, messageID);
  }

  if (!args.length) {
    return api.sendMessage(module.exports.config.usages, threadID, messageID);
  }

  const sub = args[0].toLowerCase();

  if (sub === "on") {
    const limit = parseInt(args[1]) || 10;
    await setData(`spamkick/${threadID}`, { enabled: true, limit });
    return api.sendMessage(`✅ Spam auto-kick enabled (limit: ${limit} msgs).`, threadID, messageID);
  }

  if (sub === "off") {
    await setData(`spamkick/${threadID}`, { enabled: false });
    return api.sendMessage("❌ Spam auto-kick disabled.", threadID, messageID);
  }

  if (sub === "status") {
    const data = await getData(`spamkick/${threadID}`) || { enabled: false, limit: 10 };
    return api.sendMessage(
      `📊 Spam Auto-Kick Status:\n\nEnabled: ${data.enabled ? "✅ Yes" : "❌ No"}\nLimit: ${data.limit || 10} msgs`,
      threadID,
      messageID
    );
  }

  return api.sendMessage(module.exports.config.usages, threadID, messageID);
};

// 🧠 Event Listener (Spam Detection)
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;

  // ❌ Skip protected UIDs
  if (PROTECTED_UIDS.includes(senderID)) return;

  const config = await getData(`spamkick/${threadID}`);
  if (!config || !config.enabled) return;

  // Initialize cache per thread
  if (!spamCache[threadID]) spamCache[threadID] = {};

  if (!spamCache[threadID][senderID]) {
    spamCache[threadID][senderID] = { count: 0, lastMsg: Date.now() };
  }

  const userData = spamCache[threadID][senderID];
  const now = Date.now();

  // Reset count kung lumipas na ng 5s
  if (now - userData.lastMsg > 5000) {
    userData.count = 0;
  }

  userData.count++;
  userData.lastMsg = now;

  if (userData.count >= config.limit) {
    try {
      await api.removeUserFromGroup(senderID, threadID);
      api.sendMessage(`⚠️ User ${senderID} has been kicked for spamming.`, threadID);
    } catch (e) {
      api.sendMessage(`❌ Failed to kick spammer (need admin privileges).`, threadID);
    }
    userData.count = 0; // reset after kick
  }
};