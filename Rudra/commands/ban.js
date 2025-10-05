const { db } = require("../../database.js");

module.exports.config = {
  name: "ban",
  version: "4.0.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Ban a user by replying to their message",
  commandCategory: "moderation",
  usages: "/ban add <reason>"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageReply } = event;
  const allowedUID = "61559999326713";

  // ✅ Check if GC admin or allowed user
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(e => e.id);
  const isAdmin = adminIDs.includes(senderID);

  if (senderID !== allowedUID && !isAdmin)
    return api.sendMessage("⛔ Only GC admins or authorized user can use this command.", threadID);

  if (!args[0] || args[0].toLowerCase() !== "add")
    return api.sendMessage("❗ Usage: /ban add <reason> (must reply to a user)", threadID);

  if (!messageReply)
    return api.sendMessage("⚠️ You must reply to the user's message you want to ban.", threadID);

  const reason = args.slice(1).join(" ");
  if (!reason)
    return api.sendMessage("⚠️ Please provide a reason for the ban.", threadID);

  const uid = messageReply.senderID;

  try {
    // 🔍 Check if user already banned
    const ref = db.ref(`bans/${threadID}/${uid}`);
    const snapshot = await ref.get();

    if (snapshot.exists())
      return api.sendMessage("🚫 That user is already banned in this GC.", threadID);

    // 💾 Save to Firebase
    await ref.set({
      uid,
      reason,
      bannedBy: senderID,
      time: new Date().toISOString()
    });

    const info = await api.getUserInfo(uid);
    const userName = info?.[uid]?.name || "User";

    return api.sendMessage(
      `✅ Successfully banned ${userName}!\n📄 Reason: ${reason}`,
      threadID
    );
  } catch (err) {
    console.error("❌ Ban Error:", err);
    return api.sendMessage("⚠️ Failed to ban user. Check logs.", threadID);
  }
};
