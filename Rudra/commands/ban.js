const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "ban",
  version: "4.0.0",
  hasPermssion: 1,
  credits: "ChatGPT",
  description: "Ban/unban users (persistent per group with Firebase)",
  commandCategory: "group",
  usages: "ban [@tag|reply] reason | listban | unban <uid> | reset",
  cooldowns: 5
};

// === Auto enforce bans ===
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID } = event;
  if (!threadID) return;

  const groupData = (await getData(`bans/${threadID}`)) || { banned: {} };

  if (event.logMessageType === "log:subscribe") {
    const addedIDs = event.logMessageData.addedParticipants.map(p => p.userFbId);
    for (const uid of addedIDs) {
      if (groupData.banned[uid]) {
        try {
          const name = (await api.getUserInfo(uid))[uid]?.name || uid;
          api.sendMessage(`⛔ ${name} is banned and cannot rejoin this group.\n📌 Reason: ${groupData.banned[uid].reason}`, threadID);
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

  let groupData = (await getData(`bans/${threadID}`)) || { banned: {} };

  // ✅ Check permissions
  const isBotAdmin = global.config.ADMINBOT.includes(senderID);
  const threadInfo = await api.getThreadInfo(threadID);
  const isGroupAdmin = threadInfo.adminIDs.some(item => item.id == senderID);

  if (!isBotAdmin && !isGroupAdmin) {
    return api.sendMessage("❌ Only group admins or bot admins can use the ban command.", threadID, messageID);
  }

  // listban
  if (args[0] === "listban") {
    const banned = groupData.banned;
    const uids = Object.keys(banned);

    if (!uids.length) {
      return api.sendMessage("✅ No banned users in this group.", threadID, messageID);
    }

    let msg = "⛔ Banned users:\n";
    for (const uid of uids) {
      const name = (await api.getUserInfo(uid))[uid]?.name || uid;
      msg += `• ${name} (${uid})\n  Reason: ${banned[uid].reason}\n`;
    }
    return api.sendMessage(msg, threadID, messageID);
  }

  // unban
  if (args[0] === "unban") {
    const uid = args[1];
    if (!uid) return api.sendMessage("❌ Usage: ban unban <uid>", threadID, messageID);

    if (!groupData.banned[uid]) {
      return api.sendMessage("⚠️ User not banned.", threadID, messageID);
    }

    delete groupData.banned[uid];
    await setData(`bans/${threadID}`, groupData);

    const name = (await api.getUserInfo(uid))[uid]?.name || uid;
    return api.sendMessage(`✅ ${name} has been unbanned.`, threadID, messageID);
  }

  // reset
  if (args[0] === "reset") {
    groupData = { banned: {} };
    await setData(`bans/${threadID}`, groupData);
    return api.sendMessage("🔄 All bans reset for this group.", threadID, messageID);
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
    groupData.banned[uid] = { reason, date: Date.now() };

    try {
      const name = (await api.getUserInfo(uid))[uid]?.name || uid;
      await api.sendMessage(`⛔ ${name} has been banned.\n📌 Reason: ${reason}`, threadID);
      await api.removeUserFromGroup(uid, threadID);
    } catch (e) {
      console.error("Remove error:", e);
    }
  }

  await setData(`bans/${threadID}`, groupData);
};
