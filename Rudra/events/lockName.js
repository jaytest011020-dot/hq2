const fs = require("fs");
const { lockedSettings } = require("../commands/lockgroup.js");

module.exports.config = {
  name: "lockgroupEvent",
  eventType: ["log:thread-name", "log:thread-image"], // ✅ use thread-image for photo
  version: "1.0.1",
  credits: "ChatGPT"
};

module.exports.run = async ({ api, event }) => {
  const { threadID, logMessageType, logMessageData } = event;
  if (!lockedSettings[threadID]) return;
  const locked = lockedSettings[threadID];

  // 🔒 Restore group name
  if (logMessageType === "log:thread-name" && locked.name) {
    if (logMessageData?.name !== locked.name) {
      try {
        await api.setTitle(locked.name, threadID);
        return api.sendMessage(`⏪ Restored group name: ${locked.name}`, threadID);
      } catch (e) {
        console.error(e);
        return api.sendMessage("⚠ Bot is not admin. Cannot restore name!", threadID);
      }
    }
  }

  // 🔒 Restore group photo
  if (logMessageType === "log:thread-image" && locked.image) {
    if (fs.existsSync(locked.image)) {
      try {
        await api.changeGroupImage(fs.createReadStream(locked.image), threadID);
        return api.sendMessage("⏪ Restored group photo (locked).", threadID);
      } catch (e) {
        console.error(e);
        return api.sendMessage("⚠ Bot is not admin. Cannot restore photo!", threadID);
      }
    }
  }
};
