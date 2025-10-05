const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "ban",
  version: "4.0.1",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Ban a user by replying to their message",
  commandCategory: "moderation",
  usages: "/ban add <reason>"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageReply, messageID } = event;
  const allowedUID = "61559999326713"; // ikaw lang ang main admin

  // ✅ Check if GC admin or allowed user
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(e => e.id);
  const isAdmin = adminIDs.includes(senderID);

  if (senderID !== allowedUID && !isAdmin)
    return api.sendMessage("⛔ Only GC admins or authorized user can use this command.", threadID, messageID);

  if (!args[0] || args[0].toLowerCase() !== "add")
    return api.sendMessage("❗ Usage: /ban add <reason> (must reply to a user)", threadID, messageID);

  if (!messageReply)
    return api.sendMessage("⚠️ You must reply to the user's message you want to ban.", threadID, messageID);

  const reason = args.slice(1).join(" ");
  if (!reason)
    return api.sendMessage("⚠️ Please provide a reason for the ban.", threadID, messageID);

  const uid = messageReply.senderID;

  try {
    // 🔍 Check kung banned na
    const existingBans = await getData(`bans/${threadID}`) || {};
    if (existingBans[uid])
      return api.sendMessage("🚫 That user is already banned in this GC.", threadID, messageID);

    // 💾 Save to DB
    existingBans[uid] = {
      uid,
      reason,
      bannedBy: senderID,
      time: new Date().toISOString()
    };
    await setData(`bans/${threadID}`, existingBans);

    // 🧠 Kunin info ng user
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
