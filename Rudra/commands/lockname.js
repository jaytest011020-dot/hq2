const fs = require("fs");
const axios = require("axios");

// Storage para sa locked group settings
const lockedNames = {};
const lockedImages = {};

module.exports.config = {
  name: "lockgroup",
  version: "1.0",
  credits: "ChatGPT",
  description: "Lock group name or image",
  commandCategory: "group",
  usages: "/lockgroup lockname <name>\n/lockgroup lockimg <url>",
  cooldowns: 5
};

// Command handler (para mag-lock ng name or image)
module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;

  if (args[0] === "lockname") {
    const name = args.slice(1).join(" ");
    if (!name) return api.sendMessage("❌ Please provide a group name to lock.", threadID);

    lockedNames[threadID] = name;
    return api.sendMessage(`🔒 Group name locked: ${name}`, threadID);
  }

  if (args[0] === "lockimg") {
    const url = args[1];
    if (!url) return api.sendMessage("❌ Please provide an image URL.", threadID);

    const path = __dirname + `/cache/lock_${threadID}.jpg`;
    try {
      const res = await axios.get(url, { responseType: "arraybuffer" });
      fs.writeFileSync(path, res.data);
      lockedImages[threadID] = path;
      return api.sendMessage(`🖼️ Group image locked.`, threadID);
    } catch (e) {
      return api.sendMessage("❌ Failed to download image.", threadID);
    }
  }

  return api.sendMessage("❌ Invalid usage.\n/lockgroup lockname <name>\n/lockgroup lockimg <url>", threadID);
};

// Event handler (para mag-restore pag may nagbago)
module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, logMessageType, logMessageData, author } = event;

  // Debug logs (para makita natin kung tama yung field names)
  console.log("EVENT:", logMessageType, logMessageData);

  // If group name changed
  if (logMessageType === "log:thread-name") {
    const lockedName = lockedNames[threadID];
    if (lockedName) {
      const newName = logMessageData?.name || logMessageData?.threadName;
      if (newName !== lockedName) {
        await api.setTitle(lockedName, threadID);
        return api.sendMessage(
          `⚠️ ${author} tried to change group name.\nRestored to: ${lockedName}`,
          threadID
        );
      }
    }
  }

  // If group image changed
  if (logMessageType === "log:thread-image") {
    const lockedImg = lockedImages[threadID];
    if (lockedImg) {
      await api.changeGroupImage(fs.createReadStream(lockedImg), threadID);
      return api.sendMessage(
        `⚠️ ${author} tried to change group image.\nRestored.`,
        threadID
      );
    }
  }
};
