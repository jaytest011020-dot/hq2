const OWNER_UID = "61559999326713"; // ikaw lang ang makakagamit
let lockedGroupNames = {}; // memory para sa locked names

module.exports.config = {
  name: "lockgroup",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Rudra x ChatGPT (merged version)",
  description: "Lock group name and auto-restore if changed",
  commandCategory: "group",
  usages: "lockgroup lock/unlock/reset <name>",
  cooldowns: 3,
  eventType: ["log:thread-name"] // auto trigger pag may nagbago
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID } = event;

  // Owner lang pwede gumamit
  if (senderID !== OWNER_UID) 
    return api.sendMessage("⛔ Only the owner can use this command!", threadID);

  const subcmd = args[0]?.toLowerCase();
  if (!subcmd) 
    return api.sendMessage("⚠️ Usage: lockgroup lock/unlock/reset <name>", threadID);

  switch (subcmd) {
    case "lock": {
      const name = args.slice(1).join(" ");
      if (!name) 
        return api.sendMessage("❗ Please provide a group name!\nUsage: lockgroup lock <name>", threadID);

      lockedGroupNames[threadID] = name;
      await api.setTitle(name, threadID);
      return api.sendMessage(`🔒 Group name locked: ${name}`, threadID);
    }

    case "unlock": {
      delete lockedGroupNames[threadID];
      return api.sendMessage("🔓 Group name unlocked.", threadID);
    }

    case "reset": {
      if (!lockedGroupNames[threadID]) 
        return api.sendMessage("⚠️ No group name is locked.", threadID);

      await api.setTitle(lockedGroupNames[threadID], threadID);
      return api.sendMessage(`♻️ Group name reset to: ${lockedGroupNames[threadID]}`, threadID);
    }

    default:
      return api.sendMessage("⚠️ Usage: lockgroup lock/unlock/reset <name>", threadID);
  }
};

// Listener para sa pagbabago ng GC name
module.exports.handleEvent = async function({ api, event }) {
  if (event.logMessageType === "log:thread-name") {
    const { threadID, logMessageData, author } = event;
    const lockedName = lockedGroupNames[threadID];

    if (lockedName && logMessageData?.name !== lockedName) {
      try {
        await api.setTitle(lockedName, threadID);
        const userName = (await api.getUserInfo(author))[author].name;
        return api.sendMessage(
          `⚠️ ${userName}, this group name is locked!\n🔒 Restored to: ${lockedName}`,
          threadID
        );
      } catch (err) {
        console.log("Error restoring group name:", err);
      }
    }
  }
};
