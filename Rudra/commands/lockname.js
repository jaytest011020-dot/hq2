const fs = require("fs-extra");
const axios = require("axios");

const OWNER_UID = "61559999326713";
let lockedNames = {};
let lockedImages = {};

module.exports.config = {
  name: "lockgroup",
  version: "1.3.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Lock group name or image. Restores if changed.",
  commandCategory: "group",
  usages: "/lockgroup lockname <name> | lockimage (reply) | unlockname | unlockimage | reset",
  cooldowns: 3
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID, messageReply } = event;
  if (senderID !== OWNER_UID) 
    return api.sendMessage("⛔ Only the owner can use this command!", threadID);

  const subcmd = args[0]?.toLowerCase();
  if (!subcmd)
    return api.sendMessage("⚠️ Usage: /lockgroup lockname <name> | lockimage (reply) | unlockname | unlockimage | reset", threadID);

  switch (subcmd) {
    case "lockname": {
      const name = args.slice(1).join(" ");
      if (!name) return api.sendMessage("❗ Please provide a group name.", threadID);
      lockedNames[threadID] = name;
      await api.setTitle(name, threadID);
      return api.sendMessage(`🔒 Group name locked: ${name}`, threadID);
    }

    case "lockimage": {
      if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0)
        return api.sendMessage("❗ Reply to a group image to lock it.", threadID);

      const attachment = messageReply.attachments[0];
      if (attachment.type !== "photo")
        return api.sendMessage("❌ Please reply with a valid image.", threadID);

      // Download image
      const path = __dirname + `/cache/lockimg_${threadID}.jpg`;
      const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
      fs.writeFileSync(path, Buffer.from(response.data, "binary"));

      lockedImages[threadID] = path; // store local path
      await api.changeGroupImage(fs.createReadStream(path), threadID);
      return api.sendMessage(`🖼️ Group image locked successfully.`, threadID);
    }

    case "unlockname": {
      delete lockedNames[threadID];
      return api.sendMessage("🔓 Group name unlocked.", threadID);
    }

    case "unlockimage": {
      delete lockedImages[threadID];
      return api.sendMessage("🔓 Group image unlocked.", threadID);
    }

    case "reset": {
      if (lockedNames[threadID]) {
        await api.setTitle(lockedNames[threadID], threadID);
      }
      if (lockedImages[threadID]) {
        await api.changeGroupImage(fs.createReadStream(lockedImages[threadID]), threadID);
      }
      return api.sendMessage("♻️ Group restored (name + image).", threadID);
    }
  }
};

// Auto-restore event
module.exports.handleEvent = async ({ event, api }) => {
  const { threadID, logMessageType, logMessageData, author } = event;

  // Restore name
  if (logMessageType === "log:thread-name") {
    const lockedName = lockedNames[threadID];
    if (lockedName && logMessageData?.name !== lockedName) {
      await api.setTitle(lockedName, threadID);
      return api.sendMessage(`⚠️ ${author} tried to change group name. Restored to: ${lockedName}`, threadID);
    }
  }

  // Restore image
  if (logMessageType === "log:thread-image") {
    const lockedImg = lockedImages[threadID];
    if (lockedImg) {
      await api.changeGroupImage(fs.createReadStream(lockedImg), threadID);
      return api.sendMessage(`⚠️ ${author} tried to change group image. Restored.`, threadID);
    }
  }
};
