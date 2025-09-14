const OWNER_UID = "61559999326713"; // ikaw lang makakagamit
let lockedGroups = {}; // para i-store ang locked data per GC

module.exports.config = {
  name: "lockgroup",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Lock group name & image. If changed, bot restores it.",
  commandCategory: "group",
  usages: "lockgroup name <text> | lockgroup image (with attachment) | lockgroup unlock | lockgroup reset",
  cooldowns: 3,
  eventType: ["log:thread-name", "log:thread-icon"]
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID } = event;
  if (senderID !== OWNER_UID) return api.sendMessage("⛔ Only the owner can use this command!", threadID);

  const subcmd = args[0]?.toLowerCase();
  if (!subcmd) return api.sendMessage("⚠️ Usage: lockgroup name/image/unlock/reset", threadID);

  switch (subcmd) {
    case "name": {
      const name = args.slice(1).join(" ");
      if (!name) return api.sendMessage("❗ Please provide a group name!\nUsage: lockgroup name My Group", threadID);
      if (!lockedGroups[threadID]) lockedGroups[threadID] = {};
      lockedGroups[threadID].name = name;
      await api.setTitle(name, threadID);
      return api.sendMessage(`🔒 Group name locked: ${name}`, threadID);
    }

    case "image": {
      if (!event.messageReply && !event.attachments[0]) {
        return api.sendMessage("📷 Reply with or send an image with this command.\nUsage: lockgroup image", threadID);
      }
      const attachment = event.messageReply?.attachments?.[0] || event.attachments[0];
      if (attachment?.type !== "photo") return api.sendMessage("❌ You must attach a photo.", threadID);

      const axios = require("axios");
      const fs = require("fs-extra");
      const path = __dirname + `/cache/lockgroup_${threadID}.jpg`;

      // download image
      const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
      fs.writeFileSync(path, Buffer.from(response.data, "binary"));

      if (!lockedGroups[threadID]) lockedGroups[threadID] = {};
      lockedGroups[threadID].image = path;

      await api.changeThreadImage(fs.createReadStream(path), threadID);
      return api.sendMessage("🔒 Group image locked!", threadID);
    }

    case "unlock": {
      delete lockedGroups[threadID];
      return api.sendMessage("🔓 Group name & image unlocked.", threadID);
    }

    case "reset": {
      if (!lockedGroups[threadID]) return api.sendMessage("⚠️ Nothing is locked.", threadID);

      if (lockedGroups[threadID].name) await api.setTitle(lockedGroups[threadID].name, threadID);
      if (lockedGroups[threadID].image) {
        const fs = require("fs-extra");
        if (fs.existsSync(lockedGroups[threadID].image)) {
          await api.changeThreadImage(fs.createReadStream(lockedGroups[threadID].image), threadID);
        }
      }
      return api.sendMessage("♻️ Group restored to locked settings.", threadID);
    }

    default:
      return api.sendMessage("⚠️ Usage: lockgroup name/image/unlock/reset", threadID);
  }
};

module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, logMessageType, logMessageData } = event;
  const locked = lockedGroups[threadID];
  if (!locked) return;

  try {
    if (logMessageType === "log:thread-name" && locked.name) {
      await api.setTitle(locked.name, threadID);
      api.sendMessage(`⚠️ Group name restored to locked: ${locked.name}`, threadID);
    }

    if (logMessageType === "log:thread-icon" && locked.image) {
      const fs = require("fs-extra");
      if (fs.existsSync(locked.image)) {
        await api.changeThreadImage(fs.createReadStream(locked.image), threadID);
        api.sendMessage("⚠️ Group image restored to locked one.", threadID);
      }
    }
  } catch (e) {
    console.error("LockGroup error:", e.message);
  }
};
