const { getData, setData } = require("../../database.js");

// 👑 Jaylord only
const OWNER_ID = "61559999326713";

module.exports.config = {
  name: "addprotect",
  version: "2.2.0",
  hasPermssion: 0,
  credits: "ChatGPT + Jaylord La Peña",
  description: "Manage protected UID list (add, remove, list)",
  usages: "/addprotect <add|remove|list> [uid]",
  commandCategory: "system",
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID, messageID } = event;

  if (senderID !== OWNER_ID)
    return api.sendMessage("🚫 Only Jaylord can manage protected UIDs.", threadID, messageID);

  const subcommand = args[0]?.toLowerCase();
  let uid = args[1];

  try {
    let list = (await getData("protectedAdmins")) || [];

    if (subcommand === "add") {
      if (!uid || isNaN(uid))
        return api.sendMessage("⚠️ Please provide a valid UID.\nExample: /addprotect add 61554885397487", threadID, messageID);

      if (list.includes(uid))
        return api.sendMessage("ℹ️ That UID is already protected.", threadID, messageID);

      list.push(uid);
      await setData("protectedAdmins", list);
      return api.sendMessage(`✅ UID ${uid} added to protected list.`, threadID, messageID);

    } else if (subcommand === "remove") {
      if (!uid || isNaN(uid))
        return api.sendMessage("⚠️ Please provide a valid UID.\nExample: /addprotect remove 61554885397487", threadID, messageID);

      if (!list.includes(uid))
        return api.sendMessage("ℹ️ That UID is not in the protected list.", threadID, messageID);

      list = list.filter((id) => id !== uid);
      await setData("protectedAdmins", list);
      return api.sendMessage(`✅ UID ${uid} removed from protected list.`, threadID, messageID);

    } else if (subcommand === "list") {
      if (list.length === 0)
        return api.sendMessage("ℹ️ The protected list is currently empty.", threadID, messageID);

      return api.sendMessage(`📋 Protected UIDs:\n${list.join("\n")}`, threadID, messageID);

    } else {
      return api.sendMessage("⚠️ Invalid subcommand.\nUse: add, remove, or list\nExample: /addprotect add 61554885397487", threadID, messageID);
    }

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Error saving to Firebase.", threadID, messageID);
  }
};