const OWNER_UID = "61559999326713"; // ikaw lang pwede gumamit
let lockedNames = {};
let lockedImages = {};

module.exports.config = {
  name: "lockgroup",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Lock group name or image. Restores if changed.",
  commandCategory: "group",
  usages: "/lockgroup lockname <name> | lockimage (reply image) | unlockname | unlockimage | reset",
  cooldowns: 3
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID, messageReply } = event;
  if (senderID !== OWNER_UID) return api.sendMessage("⛔ Only the owner can use this command!", threadID);

  const subcmd = args[0]?.toLowerCase();
  if (!subcmd) return api.sendMessage("⚠️ Usage: /lockgroup lockname <name> | lockimage (reply) | unlockname | unlockimage | reset", threadID);

  switch (subcmd) {
    case "lockname": {
      const name = args.slice(1).join(" ");
      if (!name) return api.sendMessage("❗ Please provide a group name.\nUsage: /lockgroup lockname My Group", threadID);
      lockedNames[threadID] = name;
      await api.setTitle(name, threadID);
      return api.sendMessage(`🔒 Group name locked: ${name}`, threadID);
    }

    case "lockimage": {
      if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
        return api.sendMessage("❗ Reply to a group image to lock it.\nUsage: /lockgroup lockimage", threadID);
      }
      if (messageReply.attachments[0].type !== "photo") {
        return api.sendMessage("❌ Please reply with a valid image.", threadID);
      }
      lockedImages[threadID] = messageReply.attachments[0].url;
      await api.changeGroupImage(messageReply.attachments[0].url, threadID);
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
        await api.changeGroupImage(lockedImages[threadID], threadID);
      }
      return api.sendMessage("♻️ Group restored (name + image).", threadID);
    }

    default:
      return api.sendMessage("⚠️ Usage: /lockgroup lockname <name> | lockimage (reply) | unlockname | unlockimage | reset", threadID);
  }
};

// Event listener para auto-restore
module.exports.handleEvent = async ({ event, api }) => {
  const { threadID, logMessageType, logMessageData } = event;

  // Restore name
  if (logMessageType === "log:thread-name") {
    const lockedName = lockedNames[threadID];
    if (lockedName && logMessageData?.name !== lockedName) {
      await api.setTitle(lockedName, threadID);
      return api.sendMessage(`⚠️ Group name is locked. Restored to: ${lockedName}`, threadID);
    }
  }

  // Restore image
  if (logMessageType === "log:thread-icon") {
    const lockedImg = lockedImages[threadID];
    if (lockedImg) {
      await api.changeGroupImage(lockedImg, threadID);
      return api.sendMessage(`⚠️ Group image is locked. Restored.`, threadID);
    }
  }
};
