const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "ban",
  version: "5.0.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Ban a user or list banned users",
  commandCategory: "moderation",
  usages: "/ban add <reason> (reply to message) | /ban list"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageReply } = event;
  const allowedUID = "61559999326713";

  // ✅ Check if GC admin or authorized user
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(e => e.id);
  const isAdmin = adminIDs.includes(senderID);

  if (senderID !== allowedUID && !isAdmin) {
    return api.sendMessage("⛔ Only GC admins or the authorized user can use this command.", threadID);
  }

  const subCmd = args[0]?.toLowerCase();

  // 🧩 Ban Add Command
  if (subCmd === "add") {
    if (!messageReply)
      return api.sendMessage("⚠️ You must reply to the user's message you want to ban.", threadID);

    const reason = args.slice(1).join(" ");
    if (!reason)
      return api.sendMessage("⚠️ Please provide a reason for the ban.", threadID);

    const uid = messageReply.senderID;
    const bans = (await getData(`bans/${threadID}`)) || {};

    if (bans[uid]) {
      return api.sendMessage("🚫 That user is already banned in this GC.", threadID);
    }

    bans[uid] = {
      uid,
      reason,
      bannedBy: senderID,
      time: new Date().toISOString()
    };

    await setData(`bans/${threadID}`, bans);

    const info = await api.getUserInfo(uid);
    const userName = info?.[uid]?.name || "User";

    return api.sendMessage(`✅ Successfully banned ${userName}!\n📄 Reason: ${reason}`, threadID);
  }

  // 📋 Ban List Command
  if (subCmd === "list") {
    const bans = (await getData(`bans/${threadID}`)) || {};

    const entries = Object.values(bans);
    if (entries.length === 0) {
      return api.sendMessage("✅ No banned users in this GC.", threadID);
    }

    let msg = `📜 Banned Users List (${entries.length})\n─────────────────────\n`;
    for (const ban of entries) {
      const info = await api.getUserInfo(ban.uid);
      const name = info?.[ban.uid]?.name || "Unknown User";
      const date = new Date(ban.time).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
      msg += `👤 ${name}\n🆔 ${ban.uid}\n📄 ${ban.reason}\n⏰ ${date}\n\n`;
    }

    return api.sendMessage(msg, threadID);
  }

  // ❓ Help message
  return api.sendMessage("❗ Usage:\n/ban add <reason> (reply)\n/ban list - show banned users", threadID);
};
