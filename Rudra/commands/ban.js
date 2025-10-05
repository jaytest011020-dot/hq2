const { db } = require("../../database.js");

module.exports.config = {
  name: "ban",
  version: "2.1.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Ban a user by profile link and reason (only GC admin or authorized user)",
  commandCategory: "moderation",
  usages: "/ban <profile link> <reason>"
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, senderID } = event;

  // ✅ Allow only this UID or GC admin
  const allowedUID = "61559999326713";

  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(e => e.id);
  const isAdmin = adminIDs.includes(senderID);

  if (senderID !== allowedUID && !isAdmin) {
    return api.sendMessage("⛔ Only GC admins or authorized user can use this command.", threadID);
  }

  if (args.length < 2)
    return api.sendMessage("❗ Usage: /ban <profile link> <reason>", threadID);

  const profileLink = args[0];
  const reason = args.slice(1).join(" ");
  const uidMatch = profileLink.match(/\d{5,}/);

  if (!uidMatch)
    return api.sendMessage("⚠️ Invalid profile link. Please use a valid Facebook profile link.", threadID);

  const uid = uidMatch[0];
  const ref = db.ref(`bans/${threadID}/${uid}`);

  const snapshot = await ref.get();
  if (snapshot.exists()) {
    return api.sendMessage("🚫 That user is already banned in this GC.", threadID);
  }

  await ref.set({
    uid,
    reason,
    bannedBy: senderID,
    time: new Date().toISOString()
  });

  return api.sendMessage(
    `✅ Successfully banned user ${uid} from this GC.\n📄 Reason: ${reason}`,
    threadID
  );
};
