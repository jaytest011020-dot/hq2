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
  version: "1.3.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description: "Auto kick users who spam identical messages within dynamic timeframe",
  commandCategory: "moderation",
  usages: `
📌 /spamkick on <limit>
   - Enable spam auto-kick (limit identical messages, e.g. 5 messages within 10s)

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

  if (!args.length) return api.sendMessage(module.exports.config.usages, threadID, messageID);

  const sub = args[0].toLowerCase();

  if (sub === "on") {
    const limit = parseInt(args[1]) || 5;
    await setData(`spamkick/${threadID}`, { enabled: true, limit });
    return api.sendMessage(`✅ Spam auto-kick enabled (limit: ${limit} identical messages in ${limit * 2}s).`, threadID, messageID);
  }

  if (sub === "off") {
    await setData(`spamkick/${threadID}`, { enabled: false });
    return api.sendMessage("❌ Spam auto-kick disabled.", threadID, messageID);
  }

  if (sub === "status") {
    const data = await getData(`spamkick/${threadID}`) || { enabled: false, limit: 5 };
    return api.sendMessage(
      `📊 Spam Auto-Kick Status:\n\nEnabled: ${data.enabled ? "✅ Yes" : "❌ No"}\nLimit: ${data.limit || 5} identical messages in ${data.limit*2}s`,
      threadID,
      messageID
    );
  }

  return api.sendMessage(module.exports.config.usages, threadID, messageID);
};

// EVENT LISTENER
module.exports.handleEvent = async function({ api, event }) {
  const { threadID, senderID, body } = event;
  if (!threadID || !senderID || !body) return;

  const config = await getData(`spamkick/${threadID}`);
  if (!config || !config.enabled) return;

  if (!spamCache[threadID]) spamCache[threadID] = {};
  if (!spamCache[threadID][senderID]) spamCache[threadID][senderID] = {};

  const userData = spamCache[threadID][senderID];

  if (!userData[body]) userData[body] = { count: 0, firstTime: Date.now() };

  const now = Date.now();
  const timeFrame = config.limit * 2000; // limit*2 seconds

  // reset count if first message outside timeframe
  if (now - userData[body].firstTime > timeFrame) {
    userData[body].count = 0;
    userData[body].firstTime = now;
  }

  userData[body].count++;

  if (userData[body].count >= config.limit) {
    const name = await getUserName(senderID, api);
    try {
      await api.removeUserFromGroup(senderID, threadID);
      api.sendMessage(
        { body: `⚠️ User ${name} has been kicked for spamming identical messages.`, mentions: [{ tag: name, id: senderID }] },
        threadID
      );
    } catch (e) {
      api.sendMessage(`❌ Failed to kick ${name}. Bot may not have admin privileges.`, threadID);
    }
    spamCache[threadID][senderID][body] = { count: 0, firstTime: now }; // reset after kick
  }
};
