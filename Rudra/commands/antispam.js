const { setData, getData } = require("../../database.js");

// Helpers
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid]?.name) return info[uid].name;
    return "User";
  } catch { return "User"; }
}

// Config
module.exports.config = {
  name: "spamkick",
  version: "1.1.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Auto kick users who spam messages",
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

// COMMAND HANDLER
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args.length) {
    return api.sendMessage(module.exports.config.usages, threadID, messageID);
  }

  const sub = args[0].toLowerCase();

  if (sub === "on") {
    const limit = parseInt(args[1]) || 10;
    await setData(`spamkick/${threadID}`, { enabled: true, limit });
    return api.sendMessage(`✅ Spam auto-kick enabled (limit: ${limit} msgs within 5s).`, threadID, messageID);
  }

  if (sub === "off") {
    await setData(`spamkick/${threadID}`, { enabled: false });
    return api.sendMessage("❌ Spam auto-kick disabled.", threadID, messageID);
  }

  if (sub === "status") {
    const data = await getData(`spamkick/${threadID}`) || { enabled: false, limit: 10 };
    return api.sendMessage(
      `📊 Spam Auto-Kick Status:\n\nEnabled: ${data.enabled ? "✅ Yes" : "❌ No"}\nLimit: ${data.limit || 10} msgs / 5s`,
      threadID,
      messageID
    );
  }

  return api.sendMessage(module.exports.config.usages, threadID, messageID);
};

// EVENT LISTENER
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;

  const config = await getData(`spamkick/${threadID}`);
  if (!config || !config.enabled) return;

  // init cache per thread
  if (!spamCache[threadID]) spamCache[threadID] = {};
  if (!spamCache[threadID][senderID]) {
    spamCache[threadID][senderID] = { count: 0, lastMsg: Date.now() };
  }

  const userData = spamCache[threadID][senderID];
  const now = Date.now();

  // reset count if > 5s since last message
  if (now - userData.lastMsg > 5000) {
    userData.count = 0;
  }

  userData.count++;
  userData.lastMsg = now;

  if (userData.count >= config.limit) {
    const name = await getUserName(senderID, api);
    try {
      await api.removeUserFromGroup(senderID, threadID);
      api.sendMessage(
        { body: `⚠️ User ${name} has been kicked for spamming.`, mentions: [{ tag: name, id: senderID }] },
        threadID
      );
    } catch (e) {
      api.sendMessage(`❌ Failed to kick ${name}. Bot may not have admin privileges.`, threadID);
    }
    userData.count = 0; // reset after kick
  }
};
