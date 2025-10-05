const axios = require("axios");
const { db } = require("../../database.js");

module.exports.config = {
  name: "ban",
  version: "3.1.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Ban a user by Facebook link (auto converts to UID, no API key required)",
  commandCategory: "moderation",
  usages: "/ban <profile link> <reason>"
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID } = event;
  const allowedUID = "61559999326713";

  // ✅ Check GC admin or allowed user
  const threadInfo = await api.getThreadInfo(threadID);
  const adminIDs = threadInfo.adminIDs.map(e => e.id);
  const isAdmin = adminIDs.includes(senderID);

  if (senderID !== allowedUID && !isAdmin)
    return api.sendMessage("⛔ Only GC admins or authorized user can use this command.", threadID);

  if (args.length < 2)
    return api.sendMessage("❗ Usage: /ban <profile link> <reason>", threadID);

  const profileLink = args[0];
  const reason = args.slice(1).join(" ");
  let uid = null;

  try {
    // 1️⃣ Check if link already contains numeric ID
    const idMatch = profileLink.match(/(?:id=|\/)(\d{6,})/);
    if (idMatch) {
      uid = idMatch[1];
    } else {
      // 2️⃣ Try fetch UID via public Graph (no key)
      const res = await axios.get(`https://graph.facebook.com/?id=${encodeURIComponent(profileLink)}`);
      if (res.data?.id) uid = res.data.id;
      else {
        // 3️⃣ Last fallback: scrape (for /share/p/ links)
        const scrap = await axios.get(profileLink);
        const match = scrap.data.match(/entity_id":"(\d{6,})"/);
        if (match) uid = match[1];
      }
    }
  } catch (err) {
    console.error("⚠️ UID Fetch Error:", err.message);
  }

  if (!uid) return api.sendMessage("⚠️ Unable to fetch UID. Please check the link.", threadID);

  // ✅ Save to Firebase per GC
  const ref = db.ref(`bans/${threadID}/${uid}`);
  const snapshot = await ref.get();

  if (snapshot.exists())
    return api.sendMessage("🚫 That user is already banned in this GC.", threadID);

  await ref.set({
    uid,
    profileLink,
    reason,
    bannedBy: senderID,
    time: new Date().toISOString()
  });

  return api.sendMessage(
    `✅ Successfully banned!\n👤 UID: ${uid}\n🔗 Link: ${profileLink}\n📄 Reason: ${reason}`,
    threadID
  );
};
