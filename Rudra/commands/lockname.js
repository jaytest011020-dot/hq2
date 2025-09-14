// Group Name Lock Module
let lockedNames = {};

module.exports.config = {
  name: "lockname",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Lock group name. If someone changes it, the bot restores it (admin only).",
  commandCategory: "group",
  usages: "/lockname <on|off>",
  cooldowns: 3
};

// === Command Part ===
module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;

  if (!args[0]) {
    return api.sendMessage(
      "⚠️ Usage: /lockname <on|off>\n\n" +
      "🔒 on  = Lock the current group name\n" +
      "🔓 off = Unlock the group name",
      threadID
    );
  }

  const info = await api.getThreadInfo(threadID);

  if (args[0].toLowerCase() === "on") {
    lockedNames[threadID] = info.threadName;
    return api.sendMessage(`✅ Group name locked: "${info.threadName}"`, threadID);
  }

  if (args[0].toLowerCase() === "off") {
    delete lockedNames[threadID];
    return api.sendMessage("🔓 Group name unlocked.", threadID);
  }

  return api.sendMessage("⚠️ Invalid option. Use: /lockname <on|off>", threadID);
};

// === Event Listener Part ===
module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, logMessageType, logMessageData } = event;

  if (logMessageType !== "log:thread-name") return;
  const locked = lockedNames[threadID];
  if (!locked) return;

  if (logMessageData?.name !== locked) {
    try {
      // Try to restore group name
      await api.setTitle(locked, threadID, (err) => {
        if (err) {
          return api.sendMessage(
            "⚠️ Bot is not an admin, cannot restore group name!",
            threadID
          );
        }
      });
      return api.sendMessage(`⏪ Restored locked group name: "${locked}"`, threadID);
    } catch (e) {
      console.log("Error restoring group name:", e);
    }
  }
};
