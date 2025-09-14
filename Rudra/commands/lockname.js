const fs = require("fs");
const axios = require("axios");

let lockedSettings = {}; 
// { threadID: { name: "...", image: "path/to/file.jpg" } }

module.exports.config = {
  name: "lockgroup",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Lock group name & photo",
  commandCategory: "group",
  usages: "lockgroup on/off",
  cooldowns: 3
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;
  const info = await api.getThreadInfo(threadID);

  if (!args[0]) {
    return api.sendMessage(
      "⚙ Usage:\n🔒 lockgroup on → lock current name + photo\n🔓 lockgroup off → unlock",
      threadID
    );
  }

  if (args[0].toLowerCase() === "on") {
    lockedSettings[threadID] = { name: info.threadName };

    if (info.imageSrc) {
      try {
        const img = await axios.get(info.imageSrc, { responseType: "arraybuffer" });
        const path = __dirname + `/cache/lock_${threadID}.jpg`;
        fs.writeFileSync(path, Buffer.from(img.data, "binary"));
        lockedSettings[threadID].image = path;
      } catch (e) {
        console.log("❌ Error saving group photo:", e);
      }
    }

    return api.sendMessage(`✅ Group locked: "${info.threadName}"`, threadID);
  }

  if (args[0].toLowerCase() === "off") {
    delete lockedSettings[threadID];
    return api.sendMessage("🔓 Group unlocked.", threadID);
  }
};

module.exports.lockedSettings = lockedSettings;
