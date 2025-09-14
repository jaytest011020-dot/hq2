const fs = require("fs");
const { lockedSettings } = require("./lockgroup.js");

module.exports.config = {
  name: "lockgroupEvent",
  eventType: ["log:thread-name", "log:thread-icon"],
  version: "1.0.0",
  credits: "ChatGPT"
};

module.exports.run = async ({ api, event }) => {
  const { threadID, logMessageType, logMessageData } = event;
  if (!lockedSettings[threadID]) return;
  const locked = lockedSettings[threadID];

  // Restore group name
  if (logMessageType === "log:thread-name") {
    if (locked.name && logMessageData?.name !== locked.name) {
      try {
        await api.setTitle(locked.name, threadID);
        return api.sendMessage(`⏪ Restored group name: ${locked.name}`, threadID);
      } catch {
        return api.sendMessage("⚠ Bot is not admin. Cannot restore name!", threadID);
      }
    }
  }

  // Restore group photo (manual trigger — not all frameworks send event on photo change)
  if (locked.image && fs.existsSync(locked.image)) {
    try {
      await api.changeGroupImage(fs.createReadStream(locked.image), threadID);
    } catch {
      api.sendMessage("⚠ Bot is not admin. Cannot restore photo!", threadID);
    }
  }
};
