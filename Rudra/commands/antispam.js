const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "antispam",
  version: "1.1.0",
  credits: "Jaylord La Peña + ChatGPT",
  description: "Enable/disable anti-spam system with auto warning and kick",
  usages: "/antispam on | /antispam off",
  commandCategory: "moderation",
  cooldowns: 3,
};

let spamTracker = {}; // {threadID: {uid: {count, lastMsg, firstTime, warned}}}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  if (command !== "on" && command !== "off") {
    return api.sendMessage("❌ Usage: /antispam on | /antispam off", threadID, messageID);
  }

  let status = command === "on";
  await setData(`antispam/status/${threadID}`, { enabled: status });

  return api.sendMessage(
    `🛡️ Anti-Spam is now ${status ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
    threadID,
    messageID
  );
};

// 🛡️ Spam Detection Handler
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID, body } = event;
  if (!body) return;

  // 🔹 Check if anti-spam enabled
  const status = (await getData(`antispam/status/${threadID}`)) || { enabled: false };
  if (!status.enabled) return;

  // 🔹 Init tracker
  if (!spamTracker[threadID]) spamTracker[threadID] = {};
  if (!spamTracker[threadID][senderID]) {
    spamTracker[threadID][senderID] = { count: 0, lastMsg: "", firstTime: Date.now(), warned: false };
  }

  let userData = spamTracker[threadID][senderID];
  const now = Date.now();

  // Reset kung lumagpas na sa 10s window
  if (now - userData.firstTime > 10000) {
    userData.count = 0;
    userData.firstTime = now;
    userData.lastMsg = body;
    userData.warned = false;
  }

  // 🔹 If same message repeated
  if (userData.lastMsg === body) {
    userData.count++;
  } else {
    userData.count = 1;
    userData.lastMsg = body;
    userData.firstTime = now;
  }

  // ⚠️ First offense = warning
  if (userData.count >= 5 && !userData.warned) {
    userData.warned = true;
    userData.count = 0; // reset after warning
    return api.sendMessage(
      `⚠️ Warning to user ${senderID}: Stop spamming! (Next spam = kick)`,
      threadID
    );
  }

  // 🚨 Second offense = kick
  if (userData.count >= 5 && userData.warned) {
    try {
      await api.removeUserFromGroup(senderID, threadID);
      delete spamTracker[threadID][senderID];
      return api.sendMessage(
        `🚨 User ${senderID} has been kicked for spamming.`,
        threadID
      );
    } catch (err) {
      return api.sendMessage("❌ Failed to kick spammer. Maybe I'm not admin.", threadID);
    }
  }
};
