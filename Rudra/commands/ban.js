// === modules/commands/ban.js ===
const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "bans.json");

// Load or create bans.json
let bans = {};
if (fs.existsSync(dataFile)) {
  try {
    bans = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    bans = {};
  }
} else {
  bans = {};
  fs.writeFileSync(dataFile, JSON.stringify(bans, null, 2), "utf8");
}

// Save helper
function saveBans() {
  fs.writeFileSync(dataFile, JSON.stringify(bans, null, 2), "utf8");
}

module.exports.config = {
  name: "ban",
  version: "3.1.0",
  hasPermssion: 1, // only admins
  credits: "ChatGPT",
  description: "Ban/unban users (persistent per group)",
  commandCategory: "group",
  usages: "ban [@tag|reply] reason | listban | unban <uid> | reset",
  cooldowns: 5
};

// === Auto enforce bans (prevent rejoin) ===
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID } = event;
  if (!threadID) return;

  if (!bans[threadID]) {
    bans[threadID] = { warns: {}, banned: [] };
    saveBans();
  }

  // If someone joins, check if banned
  if (event.logMessageType === "log:subscribe") {
    const addedIDs = event.logMessageData.addedParticipants.map(p => p.userFbId);
    for (const uid of addedIDs) {
      if (bans[threadID].banned.includes(uid)) {
        try {
          const name = (await api.getUserInfo(uid))[uid]?.name || uid;
          api.sendMessage(`⛔ ${name} is banned and cannot rejoin this group.`, threadID);
          await api.removeUserFromGroup(uid, threadID);
        } catch (e) {
          console.error("Ban enforce error:", e);
        }
      }
    }
  }
};

// === Run command ===
module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID, mentions, type, messageReply } = event;

  if (!bans[threadID]) {
    bans[threadID] = { warns: {}, banned: [] };
    saveBans();
  }

  // ✅ Check permissions (group admin or bot admin only)
  const isBotAdmin = global.config.ADMINBOT.includes(senderID);
  const threadInfo = await api.getThreadInfo(threadID);
  const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);

  if (!isBotAdmin && !isGroupAdmin) {
    return api.sendMessage("❌ Only group admins or bot admins can use the ban command.", threadID, messageID);
  }

  // listban
  if (args[0] === "listban") {
    const list = bans[threadID].banned;
    if (!list.length) {
      return api.sendMessage("✅ No banned users in this group.", threadID, messageID);
    }
    let msg = "⛔ Banned users:\n";
    for (const uid of list) {
      const name = (await api.getUserInfo(uid))[uid]?.name || uid;
      msg += `• ${name} (${uid})\n`;
    }
    return api.sendMessage(msg, threadID, messageID);
  }

  // unban
  if (args[0] === "unban") {
    const uid = args[1];
    if (!uid) return api.sendMessage("❌ Usage: ban unban <uid>", threadID, messageID);
    if (!bans[threadID].banned.includes(uid)) {
      return api.sendMessage("⚠️ User not banned.", threadID, messageID);
    }
    bans[threadID].banned = bans[threadID].banned.filter(id => id !== uid);
    saveBans();
    const name = (await api.getUserInfo(uid))[uid]?.name || uid;
    return api.sendMessage(`✅ ${name} has been unbanned.`, threadID, messageID);
  }

  // reset
  if (args[0] === "reset") {
    bans[threadID] = { warns: {}, banned: [] };
    saveBans();
    return api.sendMessage("🔄 All warnings and bans reset for this group.", threadID, messageID);
  }

  // ban command
  let targetIDs = [];
  if (type === "message_reply" && messageReply) {
    targetIDs.push(messageReply.senderID);
  } else if (Object.keys(mentions).length > 0) {
    targetIDs = Object.keys(mentions);
  } else {
    return api.sendMessage("❌ Usage: ban [@tag|reply] reason", threadID, messageID);
  }

  const reason = args.slice(1).join(" ") || "No reason provided";

  for (const uid of targetIDs) {
    if (!bans[threadID].banned.includes(uid)) {
      bans[threadID].banned.push(uid);
    }
    if (!bans[threadID].warns[uid]) bans[threadID].warns[uid] = [];
    bans[threadID].warns[uid].push(reason);

    try {
      const name = (await api.getUserInfo(uid))[uid]?.name || uid;
      await api.sendMessage(`⛔ ${name} has been banned.\n📌 Reason: ${reason}`, threadID);
      await api.removeUserFromGroup(uid, threadID);
    } catch (e) {
      console.error("Remove error:", e);
    }
  }

  saveBans();
};
