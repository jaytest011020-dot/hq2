let lockedSettings = {}; 
// { threadID: { name: "...", image: "path/to/file.jpg" } }

const fs = require("fs");
const axios = require("axios");

module.exports.config = {
  name: "lockgroup",
  version: "5.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auto lock group name & picture",
  commandCategory: "group",
  usages: "/lockgroup on | /lockgroup off",
  cooldowns: 3
};

// === Command ===
module.exports.run = async ({ api, event, args }) => {
  const { threadID } = event;
  const info = await api.getThreadInfo(threadID);

  if (!args[0]) {
    return api.sendMessage(
      "⚙ Usage:\n" +
      "🔒 /lockgroup on  → Lock current name & picture\n" +
      "🔓 /lockgroup off → Unlock group",
      threadID
    );
  }

  if (args[0].toLowerCase() === "on") {
    lockedSettings[threadID] = { name: info.threadName };

    // Download & save current group picture
    if (info.imageSrc) {
      try {
        const img = await axios.get(info.imageSrc, { responseType: "arraybuffer" });
        const path = __dirname + `/cache/lock_${threadID}.jpg`;
        fs.writeFileSync(path, Buffer.from(img.data, "binary"));
        lockedSettings[threadID].image = path;
      } catch (e) {
        console.log("Error saving group photo:", e);
      }
    }

    return api.sendMessage(`✅ Group locked: "${info.threadName}" (name + picture)`, threadID);
  }

  if (args[0].toLowerCase() === "off") {
    delete lockedSettings[threadID];
    return api.sendMessage("🔓 Group unlocked (name & picture).", threadID);
  }
};

// === Event Listener ===
module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, logMessageType, logMessageData } = event;
  if (!lockedSettings[threadID]) return;

  const locked = lockedSettings[threadID];

  // 🔹 Detect name change
  if (logMessageType === "log:thread-name") {
    if (locked.name && logMessageData?.name !== locked.name) {
      try {
        await api.setTitle(locked.name, threadID);
        api.sendMessage(`⏪ Restored locked group name: "${locked.name}"`, threadID);
      } catch (err) {
        api.sendMessage("⚠ Bot is not admin. Cannot restore group name!", threadID);
      }
    }
  }

  // 🔹 Detect photo change
  if (logMessageType === "log:thread-icon" || logMessageType === "log:thread-image") {
    if (locked.image && fs.existsSync(locked.image)) {
      try {
        await api.changeGroupImage(fs.createReadStream(locked.image), threadID);
        api.sendMessage("⏪ Restored locked group photo.", threadID);
      } catch (err) {
        api.sendMessage("⚠ Bot is not admin. Cannot restore group photo!", threadID);
      }
    }
  }
};    return api.sendMessage("🔓 Group name unlocked.", threadID);
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
