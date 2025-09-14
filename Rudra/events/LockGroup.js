const fs = require("fs");
const { lockedSettings } = require("./lockgroup.js");

module.exports.config = {
  name: "lockgroupEvent",
  eventType: ["log:thread-name", "log:thread-icon", "log:thread-image"],
  version: "1.0.0",
  credits: "ChatGPT"
};

module.exports.run = async ({ api, event }) => {
  const { threadID, logMessageType, logMessageData } = event;
  if (!lockedSettings[threadID]) return;

  const locked = lockedSettings[threadID];

  // 🔹 Detect name change
  if (logMessageType === "log:thread-name") {
    if (locked.name && logMessageData?.name !== locked.name) {
      try {
        await api.setTitle(locked.name, threadID);
        api.sendMessage(`⏪ Restored locked group name: "${locked.name}"`, threadID);
      } catch {
        api.sendMessage("⚠ Bot is not admin. Cannot restore name!", threadID);
      }
    }
  }

  // 🔹 Detect photo change
  if (logMessageType === "log:thread-icon" || logMessageType === "log:thread-image") {
    if (locked.image && fs.existsSync(locked.image)) {
      try {
        await api.changeGroupImage(fs.createReadStream(locked.image), threadID);
        api.sendMessage("⏪ Restored locked group photo.", threadID);
      } catch {
        api.sendMessage("⚠ Bot is not admin. Cannot restore photo!", threadID);
      }
    }
  }
};
