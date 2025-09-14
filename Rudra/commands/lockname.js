const fs = require("fs");
const axios = require("axios");

const lockedNames = {};
const lockedImages = {};

module.exports.config = {
  name: "lockgroup",
  version: "1.1",
  credits: "ChatGPT",
  description: "Lock group name or image",
  commandCategory: "group",
  usages: "/lockgroup lockname <name>\n/lockgroup lockimg <url>\n/lockgroup unlock",
  cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;

  if (args[0] === "lockname") {
    const name = args.slice(1).join(" ");
    if (!name) return api.sendMessage("❌ Provide a group name.", threadID);

    lockedNames[threadID] = name;
    return api.sendMessage(`🔒 Locked group name: ${name}`, threadID);
  }

  if (args[0] === "lockimg") {
    const url = args[1];
    if (!url) return api.sendMessage("❌ Provide an image URL.", threadID);

    const path = __dirname + `/cache/lock_${threadID}.jpg`;
    try {
      const res = await axios.get(url, { responseType: "arraybuffer" });
      fs.writeFileSync(path, res.data);
      lockedImages[threadID] = path;
      return api.sendMessage("🖼️ Group image locked.", threadID);
    } catch (e) {
      return api.sendMessage("❌ Failed to download image.", threadID);
    }
  }

  if (args[0] === "unlock") {
    delete lockedNames[threadID];
    delete lockedImages[threadID];
    return api.sendMessage("✅ Lock removed.", threadID);
  }

  return api.sendMessage("❌ Invalid usage.", threadID);
};

module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, logMessageType, author } = event;

  // Kung nagbago ang group name
  if (logMessageType === "log:thread-name" && lockedNames[threadID]) {
    const lockedName = lockedNames[threadID];
    // ibalik agad yung naka-lock na name
    await api.setTitle(lockedName, threadID);
    return api.sendMessage(
      `⚠️ ${author} tried to change group name.\nRestored to: ${lockedName}`,
      threadID
    );
  }

  // Kung nagbago ang group image
  if (logMessageType === "log:thread-image" && lockedImages[threadID]) {
    const lockedImg = lockedImages[threadID];
    await api.changeGroupImage(fs.createReadStream(lockedImg), threadID);
    return api.sendMessage(
      `⚠️ ${author} tried to change group image.\nRestored.`,
      threadID
    );
  }
};
