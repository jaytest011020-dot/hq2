const fs = require("fs");

// Gumamit ng global para shared sa lahat ng file
if (!global.lockedSettings) global.lockedSettings = {};
let lockedSettings = global.lockedSettings;

module.exports.config = {
  name: "lockgroup",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Lock/unlock group name & photo",
  commandCategory: "group",
  usages: "lockgroup name/photo/reset",
  cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID } = event;
  const sub = args[0];

  if (!sub) return api.sendMessage(
    "⚙ Usage:\nlockgroup name <groupName>\nlockgroup photo\nlockgroup reset",
    threadID, messageID
  );

  if (sub === "name") {
    const name = args.slice(1).join(" ");
    if (!name) return api.sendMessage("❗ Provide a group name!", threadID, messageID);
    lockedSettings[threadID] = { ...lockedSettings[threadID], name };
    await api.setTitle(name, threadID);
    return api.sendMessage(`🔒 Group name locked: ${name}`, threadID, messageID);
  }

  if (sub === "photo") {
    const path = __dirname + `/cache/${threadID}.png`;
    if (event.messageReply && event.messageReply.attachments.length > 0) {
      const url = event.messageReply.attachments[0].url;
      const stream = (await require("axios").get(url, { responseType: "arraybuffer" })).data;
      fs.writeFileSync(path, Buffer.from(stream));
      lockedSettings[threadID] = { ...lockedSettings[threadID], image: path };
      return api.sendMessage("🔒 Group photo locked.", threadID, messageID);
    }
    return api.sendMessage("❗ Reply to an image to lock it as group photo.", threadID, messageID);
  }

  if (sub === "reset") {
    delete lockedSettings[threadID];
    return api.sendMessage("🔓 Lock removed.", threadID, messageID);
  }
};
